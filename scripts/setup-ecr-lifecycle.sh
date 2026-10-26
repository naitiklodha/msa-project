#!/usr/bin/env bash
# Setup ECR Lifecycle Policies for Cost Optimization
# Run this once to configure image retention policies

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
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
  "kong"
)

# Lifecycle policy: Keep last 10 images, expire untagged after 7 days, tagged after 30 days
LIFECYCLE_POLICY='{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 production images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-", "release-"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Keep last 30 development images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["latest", "sha-"],
        "countType": "imageCountMoreThan",
        "countNumber": 30
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 3,
      "description": "Expire untagged images after 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 4,
      "description": "Expire old tagged images after 30 days",
      "selection": {
        "tagStatus": "tagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 30
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}'

echo "Setting up ECR lifecycle policies for $ECR_REPOSITORY_PREFIX repositories in $AWS_REGION..."

for service in "${SERVICES[@]}"; do
  repo_name="${ECR_REPOSITORY_PREFIX}/${service}"
  echo "Configuring lifecycle policy for $repo_name..."

  aws ecr put-lifecycle-policy \
    --repository-name "$repo_name" \
    --lifecycle-policy-text "$LIFECYCLE_POLICY" \
    --region "$AWS_REGION" \
    --output json > /dev/null

  echo "✅ Configured $repo_name"
done

echo ""
echo "All ECR lifecycle policies configured successfully!"
echo ""
echo "Policy Summary:"
echo "  - Production tags (prod-*, release-*): Keep last 10"
echo "  - Development tags (latest, sha-*): Keep last 30"
echo "  - Untagged images: Expire after 7 days"
echo "  - All other tagged images: Expire after 30 days"
echo ""
echo "This will help control ECR storage costs (~$0.10/GB/month)"