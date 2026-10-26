# FocusPulse CI/CD Setup Guide

This guide walks you through setting up the complete CI/CD pipeline for FocusPulse on AWS using GitHub Actions.

## Prerequisites

- AWS Account with the resources already deployed (as shown in your cost report)
- GitHub repository with admin access
- AWS CLI configured locally (for initial setup)

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push to   │────▶│  GitHub     │────▶│   Amazon    │────▶│   Amazon    │
│   GitHub    │     │  Actions    │     │     ECR     │     │    ECS      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Smoke Test │
                    └─────────────┘
```

## Step 1: Configure GitHub OIDC with AWS

Since you already have GitHub OIDC provider set up (mentioned in your cost report), you need to create an IAM role that GitHub Actions can assume.

### 1.1 Create the GitHub Actions IAM Role

Run this in your terminal (replace with your GitHub org/repo):

```bash
# Create the trust policy
cat > /tmp/github-oidc-trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file:///tmp/github-oidc-trust.json \
  --description "Role for GitHub Actions to deploy FocusPulse"
```

### 1.2 Attach Required Permissions

Create a policy for the deployment role:

```bash
cat > /tmp/github-actions-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListTasks",
        "ecs:DescribeTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:DeregisterTaskDefinition",
        "ecs:WaitServicesStable"
      ],
      "Resource": [
        "arn:aws:ecs:ap-south-1:YOUR_ACCOUNT_ID:cluster/focuspulse-cluster",
        "arn:aws:ecs:ap-south-1:YOUR_ACCOUNT_ID:service/focuspulse-cluster/*",
        "arn:aws:ecs:ap-south-1:YOUR_ACCOUNT_ID:task-definition/focuspulse-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTargetHealth"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:GetLogEvents",
        "logs:FilterLogEvents",
        "logs:TailLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-south-1:YOUR_ACCOUNT_ID:log-group:/ecs/focuspulse*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:ap-south-1:YOUR_ACCOUNT_ID:focuspulse-person3-alerts"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file:///tmp/github-actions-policy.json
```

## Step 2: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsDeployRole` | IAM role for GitHub Actions to assume |
| `ECR_REGISTRY` | `YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com` | ECR registry URL |
| `SNS_ALERT_TOPIC` | `arn:aws:sns:ap-south-1:YOUR_ACCOUNT_ID:focuspulse-person3-alerts` | SNS topic for alerts (optional) |

## Step 3: Verify ECR Repositories Exist

Your cost report shows 11 populated ECR repositories. Verify they match the expected naming pattern:

```bash
aws ecr describe-repositories --region ap-south-1 --query 'repositories[].repositoryName' --output text | tr '\t' '\n' | grep focuspulse
```

Expected repositories:
- `focuspulse/auth-service`
- `focuspulse/game-service`
- `focuspulse/timer-service`
- `focuspulse/rag-service`
- `focuspulse/bff`
- `focuspulse/frontend`
- `focuspulse/leaderboard-service`
- `focuspulse/room-service`
- `focuspulse/notification-service`
- `focuspulse/analytics-service`
- `focuspulse/kong` (for Kong gateway)

If any are missing, create them:
```bash
aws ecr create-repository --repository-name focuspulse/auth-service --region ap-south-1
# Repeat for each service...
```

## Step 4: Push the Workflow Files

Commit and push the new workflow files:

```bash
git add .github/workflows/ci.yml .github/workflows/cd.yml scripts/deploy.sh CI_CD_SETUP.md
git commit -m "feat: add CI/CD pipeline with GitHub Actions"
git push origin main
```

## Step 5: Test the Pipeline

### 5.1 Trigger CI Manually
1. Go to GitHub Actions tab
2. Select "CI - Build, Test & Push to ECR"
3. Click "Run workflow" → "Run workflow"

### 5.2 Trigger CD Manually
1. Go to GitHub Actions tab
2. Select "CD - Deploy to ECS Fargate"
3. Click "Run workflow"
4. Choose environment (production/staging)
5. Optionally specify services to deploy
6. Click "Run workflow"

### 5.3 Auto-Deploy on Merge
After CI passes on main branch, CD will automatically trigger.

## Step 6: Use the Deployment Helper Script

For manual deployments and troubleshooting:

```bash
# Make executable
chmod +x scripts/deploy.sh

# Deploy all services
./scripts/deploy.sh deploy

# Deploy specific services
./scripts/deploy.sh deploy auth-service bff

# Deploy with specific tag
./scripts/deploy.sh deploy -t abc123 auth-service

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs auth-service

# Scale a service
./scripts/deploy.sh scale auth-service 3

# List available images
./scripts/deploy.sh images
```

## Workflow Details

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to main
- Pull requests to main
- Manual dispatch

**Jobs:**
1. **validate** - Lint all services
2. **build-and-test** - Matrix build for 11 services + consumer
3. **build-gateway** - Validate Kong config
4. **smoke-test** - Optional smoke test (manual/main branch)
5. **summary** - Pipeline summary

**Features:**
- Parallel builds for all services
- Automatic tagging (SHA + latest for main)
- ECR login via AWS Actions
- Python/Go/Node.js support per service

### CD Workflow (`.github/workflows/cd.yml`)

**Triggers:**
- Manual workflow dispatch
- Auto-trigger after successful CI on main

**Jobs:**
1. **deploy** - Deploy services to ECS
2. **rollback** - Rollback on failure (placeholder)
3. **deploy-single** - Quick single-service deploy

**Features:**
- OIDC authentication (no long-lived keys)
- Selective service deployment
- Force new deployment option
- Health verification after deploy
- Wait for service stability

## Troubleshooting

### Common Issues

**1. "AccessDenied" on ECR push**
- Verify the GitHub Actions role has ECR permissions
- Check ECR repository names match exactly

**2. "Service not found" on ECS deploy**
- Verify service names match ECS service names exactly
- Check cluster name in workflow matches your cluster

**3. OIDC token validation failed**
- Verify trust policy condition matches your repo
- Check `token.actions.githubusercontent.com:sub` format

**4. Deployment stuck in "DEPLOYING"**
- Check CloudWatch logs for the service
- Verify health checks pass
- Check target group health in ALB

### Debug Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster focuspulse-cluster --services auth-service --region ap-south-1

# Check task definition
aws ecs describe-task-definition --task-definition focuspulse-auth-service --region ap-south-1

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn> --region ap-south-1

# View service logs
aws logs tail /ecs/focuspulse --follow --filter-pattern auth-service --region ap-south-1
```

## Security Best Practices

1. **Use OIDC** - No long-lived AWS keys in GitHub
2. **Least privilege** - Role only has necessary permissions
3. **Branch protection** - Require PR reviews before merge to main
4. **Image scanning** - Enable ECR image scanning on push
5. **Secrets management** - Use AWS Secrets Manager for sensitive config

## Cost Optimization

- CI runs only on push/PR (not on every commit)
- ECR lifecycle policies to clean old images
- Spot instances for build runners (if self-hosted)
- Deploy only changed services (use `deploy-single` workflow)

## Next Steps

1. **Add automated tests** - Integrate your test suite in CI
2. **Add staging environment** - Deploy to staging first, then promote
3. **Add notifications** - Slack/Discord/email on deploy status
4. **Add canary deployments** - Gradual rollout with metrics
5. **Add infrastructure as code** - Terraform for reproducible infra

## Support

For issues:
- Check GitHub Actions logs
- Check CloudWatch Logs for ECS services
- Review CloudWatch Alarms (you have 30 configured)
- Check SNS email notifications (confirm subscription first)