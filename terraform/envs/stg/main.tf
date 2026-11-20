terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "room-booking"
      Environment = "stg"
      ManagedBy   = "terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "shared_name" {
  description = "Name of the shared VPC created by terraform/shared"
  type        = string
  default     = "room-booking"
}

data "aws_vpc" "shared" {
  tags = { Name = var.shared_name }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.shared.id]
  }
  tags = { Tier = "public" }
}

data "aws_subnets" "db" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.shared.id]
  }
  tags = { Tier = "db" }
}

data "aws_security_group" "dbops_runner" {
  vpc_id = data.aws_vpc.shared.id
  name   = "${var.shared_name}-dbops-runner"
}

module "app" {
  source = "../../modules/ecs-app"

  name                          = "room-booking-stg"
  vpc_id                        = data.aws_vpc.shared.id
  public_subnet_ids             = sort(data.aws_subnets.public.ids)
  db_subnet_ids                 = sort(data.aws_subnets.db.ids)
  db_allowed_security_group_ids = [data.aws_security_group.dbops_runner.id]
}

output "app_url" {
  value = module.app.app_url
}

output "ecs_cluster_name" {
  value = module.app.ecs_cluster_name
}

output "jdbc_url" {
  value = module.app.jdbc_url
}

output "db_username" {
  value = module.app.db_username
}

output "db_password" {
  value     = module.app.db_password
  sensitive = true
}

output "harness_env_variables" {
  value = module.app.harness_env_variables
}
