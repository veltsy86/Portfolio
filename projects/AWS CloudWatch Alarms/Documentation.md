# Project Title

AWS CloudWatch Alarm Creation

## Description

The following documentation is about the creation of EC2 CloudWatch alarms for the following metrics:

- CPUUtilization
- Memory Usage
- Disk Usage

Amazon EventBridge scans for a new EC2 State change to “running”.  Once that happens, EventBridge signals a lambda function that does an API call to all instances, confirms that alarms need to be made, and creates a series of alarms.  The alarms are created at 70%, 80%, and 90% thresholds in the metrics of CPUUtilization, Memory Usage, and Disk Usage.  Once those alarms are created, an email report is sent to the SRE for further confirmation and updates the CloudWatch dashboards.

## The Process
EventBridge runs scanning for a new instance state change, “Running”.

Event Pattern (it also looks for Auto Scaling Group changes):

{
  "source": ["aws.ec2", "aws.autoscaling"],
  "detail-type": ["EC2 Instance State-change Notification", "EC2 Instance Launch Successful", "EC2 Instance Terminate Successful"],
  "detail": {
    "state": ["running"]
  },
  "region": ["us-west-2"]
}

Once the event pattern is triggered, the following Lambda function is run:

Lambda title: {env}-CloudWatchAutoAlarms

CloudWatch alarms:

The automation creates an alarm for the following metrics at the 70, 80, and 90% thresholds:

  1. CPUUtilization - monitors the processes in the instance; if the utilization gets too high, they will not run
  2. Memory Usage - Monitors EBS storage volumes; if it gets too high, data cannot be saved, and processes cannot progress.
  3. Disk Usage - Monitors the instance's ROOT storage.  If the Root storage gets too high, it may crash, and nothing will run.

Each alarm follows the required conventions:

Name: {env}-{instanceId}-{instanceName}-metric-threshold


View Lambda code - 

<img width="2440" height="558" alt="CW Auto Alarm Creation" src="https://github.com/user-attachments/assets/f74eeb3c-50af-450e-8136-3d32c31e1a83" />

