output "app_url" {
  value = "http://${aws_lb.this.dns_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

# For the Harness DB DevOps JDBC connector. The runner reaches RDS inside the shared VPC.
output "jdbc_url" {
  value = "jdbc:postgresql://${aws_db_instance.this.endpoint}/${local.db_name}"
}

output "db_username" {
  value = local.db_username
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}

# Values referenced as <+env.variables.*> by deploy/ecs/*.yaml.
# Register them as Harness environment variables after apply.
output "harness_env_variables" {
  value = {
    ecs_execution_role_arn  = var.execution_role_arn
    ecs_log_group_name      = aws_cloudwatch_log_group.app.name
    database_url_secret_arn = aws_secretsmanager_secret.database_url.arn
    ecs_subnet_id_a         = var.public_subnet_ids[0]
    ecs_subnet_id_b         = var.public_subnet_ids[1]
    ecs_security_group_id   = aws_security_group.app.id
    alb_target_group_arn    = aws_lb_target_group.app.arn
  }
}
