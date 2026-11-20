output "vpc_id" {
  value = aws_vpc.this.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "dbops_runner_name" {
  value = var.dbops_runner_name
}

output "delegate_token_secret_arn" {
  description = "Put the Harness delegate token into this secret before enabling the runner"
  value       = aws_secretsmanager_secret.delegate_token.arn
}
