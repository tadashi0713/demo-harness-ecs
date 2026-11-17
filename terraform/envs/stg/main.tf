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

module "app" {
  source = "../../modules/ecs-app"

  name     = "room-booking-stg"
  vpc_cidr = "10.10.0.0/16"
}

output "app_url" {
  value = module.app.app_url
}

output "ecs_cluster_name" {
  value = module.app.ecs_cluster_name
}

output "harness_env_variables" {
  value = module.app.harness_env_variables
}
