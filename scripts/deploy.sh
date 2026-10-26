#!/usr/bin/env bash
# FocusPulse Deployment Helper Script
# Usage: ./scripts/deploy.sh [command] [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-south-1}"
ECS_CLUSTER="${ECS_CLUSTER:-focuspulse-cluster}"
ECR_REGISTRY="${ECR_REGISTRY:-}"
ECR_REPOSITORY_PREFIX="${ECR_REPOSITORY_PREFIX:-focuspulse}"
SERVICES=(
  "auth-service"
  "game-service"
  "timer-service"
  "rag-service"
  "bff"
  "frontend"
  "leaderboard-service"
  "room-service"
  "notification-service"
  "analytics-service"
  "focuspulse-kong-service"
)

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

usage() {
  cat <<EOF
FocusPulse Deployment Helper

Usage: $0 <command> [options]

Commands:
  deploy [service...]     Deploy services to ECS (default: all)
  rollback <service>      Rollback a service to previous task definition
  status [service...]     Check deployment status of services
  logs <service>          View logs for a service
  scale <service> <count> Scale a service to desired count
  images                  List available ECR images
  help                    Show this help

Options:
  -t, --tag TAG           Image tag to deploy (default: latest)
  -f, --force             Force new deployment
  -r, --region REGION     AWS region (default: ap-south-1)
  -c, --cluster CLUSTER   ECS cluster name (default: focuspulse-cluster)
  --dry-run               Show what would be done without executing

Examples:
  $0 deploy                           # Deploy all services with latest tag
  $0 deploy auth-service bff          # Deploy specific services
  $0 deploy -t abc123 auth-service    # Deploy specific tag
  $0 rollback auth-service            # Rollback auth-service
  $0 status                           # Check status of all services
  $0 logs auth-service                # View auth-service logs
  $0 scale auth-service 3             # Scale auth-service to 3 tasks
EOF
}

check_aws_cli() {
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install it first."
    exit 1
  fi

  if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured. Run 'aws configure' or set up OIDC."
    exit 1
  fi
}

get_ecr_registry() {
  if [ -z "$ECR_REGISTRY" ]; then
    ECR_REGISTRY=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com
    export ECR_REGISTRY
  fi
}

deploy_service() {
  local service=$1
  local tag=${2:-latest}
  local force=${3:-false}

  get_ecr_registry

  local image
  if [ "$service" = "focuspulse-kong-service" ]; then
    image="${ECR_REGISTRY}/${ECR_REPOSITORY_PREFIX}/kong:3.4"
  else
    image="${ECR_REGISTRY}/${ECR_REPOSITORY_PREFIX}/${service}:${tag}"
  fi

  log_info "Deploying $service with image $image"

  local force_flag=""
  if [ "$force" = "true" ]; then
    force_flag="--force-new-deployment"
  fi

  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$service" \
    --image "$image" \
    $force_flag \
    --region "$AWS_REGION" \
    --output json | jq -r '.service.deployments[0].status'

  log_success "Deployment initiated for $service"
}

wait_for_stable() {
  local service=$1
  log_info "Waiting for $service to stabilize..."
  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services "$service" \
    --region "$AWS_REGION"
  log_success "$service is stable"
}

check_service_health() {
  local service=$1
  log_info "Checking health of $service..."

  local task_arns
  task_arns=$(aws ecs list-tasks \
    --cluster "$ECS_CLUSTER" \
    --service-name "$service" \
    --desired-status RUNNING \
    --region "$AWS_REGION" \
    --query 'taskArns[]' \
    --output text)

  if [ -n "$task_arns" ]; then
    aws ecs describe-tasks \
      --cluster "$ECS_CLUSTER" \
      --tasks $task_arns \
      --region "$AWS_REGION" \
      --query 'tasks[].{service:group, lastStatus:lastStatus, healthStatus:healthStatus}' \
      --output table
  else
    log_warning "No running tasks for $service"
  fi
}

# Main command handling
main() {
  if [ $# -eq 0 ]; then
    usage
    exit 1
  fi

  local command=$1
  shift

  # Parse common options
  local tag="latest"
  local force="false"
  local dry_run="false"
  local services=()

  while [ $# -gt 0 ]; do
    case $1 in
      -t|--tag)
        tag="$2"
        shift 2
        ;;
      -f|--force)
        force="true"
        shift
        ;;
      -r|--region)
        AWS_REGION="$2"
        shift 2
        ;;
      -c|--cluster)
        ECS_CLUSTER="$2"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      *)
        services+=("$1")
        shift
        ;;
    esac
  done

  # If no services specified, use all
  if [ ${#services[@]} -eq 0 ] && [ "$command" != "images" ] && [ "$command" != "help" ]; then
    services=("${SERVICES[@]}")
  fi

  check_aws_cli

  case $command in
    deploy)
      log_info "Starting deployment to $ECS_CLUSTER in $AWS_REGION"
      for service in "${services[@]}"; do
        if [ "$dry_run" = "true" ]; then
          log_info "[DRY RUN] Would deploy $service with tag $tag"
        else
          deploy_service "$service" "$tag" "$force"
          wait_for_stable "$service"
          check_service_health "$service"
        fi
      done
      log_success "Deployment complete!"
      ;;

    rollback)
      if [ ${#services[@]} -ne 1 ]; then
        log_error "Rollback requires exactly one service"
        exit 1
      fi
      local service="${services[0]}"
      log_warning "Rollback for $service - manual intervention required"
      log_info "Run: aws ecs describe-services --cluster $ECS_CLUSTER --services $service --region $AWS_REGION"
      log_info "Then: aws ecs update-service --cluster $ECS_CLUSTER --service $service --task-definition <previous-task-def> --region $AWS_REGION"
      ;;

    status)
      for service in "${services[@]}"; do
        log_info "Status for $service:"
        aws ecs describe-services \
          --cluster "$ECS_CLUSTER" \
          --services "$service" \
          --region "$AWS_REGION" \
          --query 'services[0].{service:serviceName, status:status, runningCount:runningCount, desiredCount:desiredCount, deployments:deployments[0].{status:status, rolloutState:rolloutState}}' \
          --output table
      done
      ;;

    logs)
      if [ ${#services[@]} -ne 1 ]; then
        log_error "Logs command requires exactly one service"
        exit 1
      fi
      local service="${services[0]}"
      local log_group="/ecs/focuspulse"
      log_info "Fetching logs for $service from $log_group..."
      aws logs tail "$log_group" --follow --filter-pattern "$service" --region "$AWS_REGION"
      ;;

    scale)
      if [ ${#services[@]} -ne 1 ] || [ $# -ne 1 ]; then
        log_error "Scale requires service and count: $0 scale <service> <count>"
        exit 1
      fi
      local service="${services[0]}"
      local count=$1
      log_info "Scaling $service to $count tasks..."
      aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$service" \
        --desired-count "$count" \
        --region "$AWS_REGION"
      log_success "Scale initiated for $service"
      ;;

    images)
      get_ecr_registry
      log_info "Available ECR images:"
      for service in "${SERVICES[@]}"; do
        if [ "$service" = "focuspulse-kong-service" ]; then
          continue
        fi
        echo "--- $service ---"
        aws ecr describe-images \
          --repository-name "${ECR_REPOSITORY_PREFIX}/${service}" \
          --region "$AWS_REGION" \
          --query 'sort_by(imageDetails, &imagePushedAt)[-5:].{tags:imageTags, pushedAt:imagePushedAt, size:imageSizeInBytes}' \
          --output table 2>/dev/null || log_warning "Repository not found or no images"
      done
      ;;

    help|--help|-h)
      usage
      ;;

    *)
      log_error "Unknown command: $command"
      usage
      exit 1
      ;;
  esac
}

main "$@"