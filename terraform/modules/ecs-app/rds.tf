locals {
  db_name     = "booking"
  db_username = "booking"
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = aws_subnet.db[*].id
  tags       = var.tags
}

resource "aws_db_parameter_group" "this" {
  name   = var.name
  family = "postgres${split(".", var.db_engine_version)[0]}"

  # The app connects without TLS inside the VPC. Enable only after switching DATABASE_URL to TLS.
  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }

  tags = var.tags
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = local.db_name
  username = local.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  parameter_group_name   = aws_db_parameter_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  apply_immediately          = true

  deletion_protection = false
  skip_final_snapshot = true

  tags = var.tags
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.name}/database-url"
  description             = "DATABASE_URL for ${var.name}"
  recovery_window_in_days = 0
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${local.db_username}:${random_password.db.result}@${aws_db_instance.this.endpoint}/${local.db_name}"
}
