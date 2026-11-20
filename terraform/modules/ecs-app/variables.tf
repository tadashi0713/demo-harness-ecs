variable "name" {
  description = "Resource name prefix, e.g. room-booking-stg"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Subnets for the ALB and ECS tasks (two AZs)"
  type        = list(string)
}

variable "db_subnet_ids" {
  description = "Subnets for RDS (two AZs)"
  type        = list(string)
}

variable "db_allowed_security_group_ids" {
  description = "Additional security groups allowed to reach PostgreSQL, e.g. the DB DevOps runner"
  type        = list(string)
  default     = []
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_engine_version" {
  type    = string
  default = "16"
}

variable "log_retention_days" {
  type    = number
  default = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}
