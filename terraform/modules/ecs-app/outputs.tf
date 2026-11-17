output "app_url" {
  value = "http://${aws_lb.this.dns_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "db_endpoint" {
  value = aws_db_instance.this.endpoint
}

# Values referenced as <+env.variables.*> by deploy/ecs/*.yaml.
# Register them as Harness environment variables after apply.
output "harness_env_variables" {
  value = {
    ecs_execution_role_arn  = aws_iam_role.execution.arn
    ecs_task_role_arn       = aws_iam_role.task.arn
    ecs_log_group_name      = aws_cloudwatch_log_group.app.name
    database_url_secret_arn = aws_secretsmanager_secret.database_url.arn
    ecs_subnet_id_a         = aws_subnet.public[0].id
    ecs_subnet_id_b         = aws_subnet.public[1].id
    ecs_security_group_id   = aws_security_group.app.id
    alb_target_group_arn    = aws_lb_target_group.app.arn
  }
}
