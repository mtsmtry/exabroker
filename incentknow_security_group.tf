
resource "aws_security_group" "incentknow_vpc" {
  name   = "incentknow-sg"
  description = "Access in incentknow-vpc"

  egress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = "0"
    protocol    = "-1"
    self        = "false"
    to_port     = "0"
  }
}