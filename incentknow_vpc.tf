resource "aws_vpc" "incentknow_vpc" {
  assign_generated_ipv6_cidr_block = "false"
  cidr_block                       = "172.31.0.0/16"
  enable_classiclink               = "false"
  enable_classiclink_dns_support   = "false"
  enable_dns_hostnames             = "false"
  enable_dns_support               = "true"
  instance_tenancy                 = "default"

  tags = {
    Name = "incentknow-vpc"
  }
}

resource "aws_subnet" "subnet_1c" {
  assign_ipv6_address_on_creation = "false"
  cidr_block                      = "172.31.0.0/20"
  map_public_ip_on_launch         = "true"
  vpc_id                          = aws_vpc.incentknow_vpc.id

  tags = {
    Name = "incentknow-subnet-1c"
  }
}

resource "aws_subnet" "subnet_1a" {
  assign_ipv6_address_on_creation = "false"
  cidr_block                      = "172.31.32.0/20"
  map_public_ip_on_launch         = "true"
  vpc_id                          = aws_vpc.incentknow_vpc.id


  tags = {
    Name = "incentknow-subnet-1a"
  }
}

resource "aws_subnet" "subnet_1d" {
  assign_ipv6_address_on_creation = "false"
  cidr_block                      = "172.31.16.0/20"
  map_public_ip_on_launch         = "true"
  vpc_id                          = aws_vpc.incentknow_vpc.id

  tags = {
    Name = "incentknow-subnet-1d"
  }
}