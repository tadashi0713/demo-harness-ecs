# Resources shared by stg and prod: VPC, ECR and the Harness DB DevOps runner.
# Apply this stack before the environments.

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
      Project   = "room-booking"
      ManagedBy = "terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "name" {
  description = "Name of the shared VPC. envs/* look up the VPC and runner security group by this name."
  type        = string
  default     = "room-booking"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "ecr_repository_name" {
  type    = string
  default = "tadashi-demo-ecs"
}

variable "harness_account_id" {
  type    = string
  default = "EeRjnXTnS4GrLG5VNNJZUw"
}

variable "harness_manager_url" {
  description = "Manager endpoint of the Harness cluster that hosts the account (this account is on Prod2)."
  type        = string
  default     = "https://app.harness.io/gratis"
}

variable "dbops_runner_image" {
  description = "Immutable Harness delegate image for the DB DevOps runner (https://hub.docker.com/r/harness/delegate/tags). The runner is not created while this is empty."
  type        = string
  default     = "harness/delegate:26.11.90411"
}

variable "dbops_runner_name" {
  description = "Delegate name shown in Harness. Use it as the delegate selector of the AWS and JDBC connectors."
  type        = string
  default     = "room-booking-dbops-runner"
}
