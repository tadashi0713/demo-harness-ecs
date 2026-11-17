variable "name" {
  description = "Resource name prefix, e.g. room-booking-stg"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC (/16 recommended)"
  type        = string
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
