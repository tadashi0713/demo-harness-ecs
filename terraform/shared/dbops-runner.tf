# Harness DB DevOps runner on ECS Fargate.
# https://developer.harness.io/database-devops/troubleshooting-and-resources/get-started-ecs-fargate
# The runner starts migration tasks in its own subnets and security group, so RDS allows this security group.

locals {
  runner_enabled = var.dbops_runner_image != ""
}

# Created even while the runner is disabled, because envs/* reference it in the RDS security group.
resource "aws_security_group" "dbops_runner" {
  name        = "${var.name}-dbops-runner"
  description = "Harness DB DevOps runner and the migration tasks it starts"
  vpc_id      = aws_vpc.this.id
  tags        = { Name = "${var.name}-dbops-runner" }
}

resource "aws_vpc_security_group_ingress_rule" "dbops_runner_self" {
  security_group_id            = aws_security_group.dbops_runner.id
  referenced_security_group_id = aws_security_group.dbops_runner.id
  ip_protocol                  = "tcp"
  from_port                    = 20001
  to_port                      = 20001
}

resource "aws_vpc_security_group_egress_rule" "dbops_runner_all" {
  security_group_id = aws_security_group.dbops_runner.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# Set the value manually (Harness delegate token) so it never enters Terraform state.
resource "aws_secretsmanager_secret" "delegate_token" {
  name                    = "${var.name}/harness-delegate-token"
  description             = "Harness delegate token for the DB DevOps runner"
  recovery_window_in_days = 0
}

resource "aws_ecs_cluster" "dbops" {
  name = "${var.name}-dbops"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_cloudwatch_log_group" "dbops_runner" {
  name              = "/ecs/${var.name}-dbops-runner"
  retention_in_days = 7
}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by ECS to start the runner, the migration tasks, and the stg / prod app tasks.
# The AWS account is at its IAM role quota, so envs/* reuse this role instead of creating their own.
resource "aws_iam_role" "dbops_execution" {
  name               = "${var.name}-dbops-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "dbops_execution" {
  role       = aws_iam_role.dbops_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "dbops_execution" {
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "dbops_execution" {
  name   = "logs-and-secrets"
  role   = aws_iam_role.dbops_execution.id
  policy = data.aws_iam_policy_document.dbops_execution.json
}

# Assumed by the runner (and by the Harness AWS connector via "Assume IAM Role on Delegate").
resource "aws_iam_role" "dbops_runner" {
  name               = "${var.name}-dbops-runner"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

data "aws_iam_policy_document" "dbops_runner" {
  statement {
    actions = [
      "ecs:RegisterTaskDefinition",
      "ecs:DeregisterTaskDefinition",
      "ecs:RunTask",
      "ecs:StopTask",
      "ecs:DescribeTasks",
      "ecs:DescribeTaskDefinition",
      "ecs:ListTasks",
      "ecs:TagResource",
    ]
    resources = ["*"]
  }
  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.dbops_execution.arn, aws_iam_role.dbops_runner.arn]
  }
  statement {
    # DescribeRegions is used by the Harness AWS connector test.
    actions   = ["ec2:DescribeNetworkInterfaces", "ec2:DescribeSubnets", "ec2:DescribeSecurityGroups", "ec2:DescribeRegions"]
    resources = ["*"]
  }
  statement {
    actions   = ["logs:CreateLogGroup", "logs:TagResource", "logs:PutRetentionPolicy"]
    resources = ["*"]
  }
  statement {
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:DeleteSecret",
      "secretsmanager:TagResource",
      "secretsmanager:GetSecretValue",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "dbops_runner" {
  name   = "dbops-runner"
  role   = aws_iam_role.dbops_runner.id
  policy = data.aws_iam_policy_document.dbops_runner.json
}

resource "aws_ecs_task_definition" "dbops_runner" {
  count = local.runner_enabled ? 1 : 0

  family                   = "${var.name}-dbops-runner"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.dbops_execution.arn
  task_role_arn            = aws_iam_role.dbops_runner.arn

  container_definitions = jsonencode([{
    name      = "harness-runner-ecs"
    image     = var.dbops_runner_image
    essential = true
    environment = [
      { name = "ACCOUNT_ID", value = var.harness_account_id },
      { name = "MANAGER_HOST_AND_PORT", value = var.harness_manager_url },
      { name = "DELEGATE_NAME", value = var.dbops_runner_name },
      { name = "DELEGATE_TYPE", value = "DOCKER" },
      { name = "NEXT_GEN", value = "true" },
    ]
    secrets = [
      { name = "DELEGATE_TOKEN", valueFrom = aws_secretsmanager_secret.delegate_token.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.dbops_runner.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "dbops_runner" {
  count = local.runner_enabled ? 1 : 0

  name            = "${var.name}-dbops-runner"
  cluster         = aws_ecs_cluster.dbops.id
  task_definition = aws_ecs_task_definition.dbops_runner[0].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.dbops_runner.id]
    assign_public_ip = true
  }
}
