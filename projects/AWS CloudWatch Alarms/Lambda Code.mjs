import { CloudWatchClient, PutMetricAlarmCommand } from '@aws-sdk/client-cloudwatch';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

async function getInstanceName(instanceId) {
    try {
        const command = new DescribeInstancesCommand({
            InstanceIds: [instanceId]
        });
        
        const result = await ec2Client.send(command);
        
        if (result.Reservations && result.Reservations.length > 0) {
            const instance = result.Reservations[0].Instances[0];
            const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
            
            return {
                instanceId: instanceId,
                instanceName: nameTag ? nameTag.Value : instanceId,
                tags: instance.Tags || []
            };
        }
        
        return {
            instanceId: instanceId,
            instanceName: instanceId,
            tags: []
        };
        
    } catch (error) {
        console.error(`Error getting instance details for ${instanceId}:`, error);
        return {
            instanceId: instanceId,
            instanceName: instanceId,
            tags: []
        };
    }
}

//Get Instance Name
async function getMultipleInstanceNames(instanceIds) {
    try {
        const params = {
            InstanceIds: instanceIds
        };
        
        const result = await ec2.describeInstances(params).promise();
        const instanceDetails = [];
        
        result.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
                instanceDetails.push({
                    instanceId: instance.InstanceId,
                    instanceName: nameTag ? nameTag.Value : instance.InstanceId,
                    tags: instance.Tags || []
                });
            });
        });
        
        return instanceDetails;
        
    } catch (error) {
        console.error('Error getting multiple instance details:', error);
        return instanceIds.map(id => ({
            instanceId: id,
            instanceName: id,
            tags: []
        }));
    }
}

// Helper function to create alarms with retry logic
async function createAlarmWithRetry(alarmParams, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await cloudWatchClient.send(new PutMetricAlarmCommand(alarmParams));
            return;
            
        } catch (error) {
            if (error.name === 'Throttling' || error.message.includes('Rate exceeded')) {
                if (attempt === maxRetries) {
                    console.error(`Failed to create alarm after ${maxRetries} attempts:`, error);
                    throw error;
                }
                
                const baseDelay = Math.pow(1.5, attempt) * 500;
                const jitter = Math.random() * 200;
                const delay = baseDelay + jitter;
                
                console.log(`Rate limit hit for alarm ${alarmParams.AlarmName}, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`Non-throttling error creating alarm ${alarmParams.AlarmName}:`, error);
                throw error;
            }
        }
    }
}

// Get EC2 instances
async function getInstances() {
    try {
        const command = new DescribeInstancesCommand({
            Filters: [
                {
                    Name: 'instance-state-name',
                    Values: ['running']
                }
            ]
        });
        
        const response = await ec2Client.send(command);
        const instances = [];
        
        for (const reservation of response.Reservations) {
            for (const instance of reservation.Instances) {
                instances.push(instance);
            }
        }
        
        return instances;
    } catch (error) {
        console.error('Error getting instances:', error);
        throw error;
    }
}

// Create CPU alarms
async function createCPUAlarms(instanceId, instanceDetails) {
    const thresholds = [70, 80, 90];
    
    for (let i = 0; i < thresholds.length; i++) {
        const threshold = thresholds[i];
        
        const command = new PutMetricAlarmCommand({
            AlarmName: `dev-${instanceDetails.instanceName}-${instanceId}-CPUUtilization-${threshold}`,
            AlarmDescription: `CPU ${threshold}% alarm for ${instanceDetails.instanceName} (${instanceId})`,
            ActionsEnabled: true,
            MetricName: 'CPUUtilization',
            Namespace: 'AWS/EC2',
            Statistic: 'Average',
            Dimensions: [
                {
                    Name: 'InstanceId',
                    Value: instanceId
                }
            ],
            Period: 300,
            EvaluationPeriods: 2,
            DatapointsToAlarm: 1,
            Threshold: threshold,
            ComparisonOperator: 'GreaterThanThreshold',
            TreatMissingData: 'notBreaching',
            AlarmActions: [process.env.SUCCESS_NOTIFICATION_TOPIC_ARN]
        });
        
        try {
            await cloudWatchClient.send(command);
            console.log(`Created CPU ${threshold}% alarm for ${instanceId}`);
            
            if (i < thresholds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`Error creating CPU ${threshold}% alarm for ${instanceId}:`, error);
            throw error;
        }
    }
}

// Create Memory alarms
async function createMemoryAlarms(instanceId, instanceDetails) {
    const thresholds = [70, 80, 90];
    
    for (let i = 0; i < thresholds.length; i++) {
        const threshold = thresholds[i];
        
        const command = new PutMetricAlarmCommand({
            AlarmName: `dev-${instanceDetails.instanceName}-${instanceId}-MemoryUtilization-${threshold}`,
            AlarmDescription: `Memory ${threshold}% alarm for ${instanceDetails.instanceName} (${instanceId})`,
            ActionsEnabled: true,
            MetricName: 'MemoryUtilization',
            Namespace: 'CWAgent',
            Statistic: 'Average',
            Dimensions: [
                {
                    Name: 'InstanceId',
                    Value: instanceId
                }
            ],
            Period: 300,
            EvaluationPeriods: 2,
            DatapointsToAlarm: 1,
            Threshold: threshold,
            ComparisonOperator: 'GreaterThanThreshold',
            TreatMissingData: 'notBreaching',
            AlarmActions: [process.env.SUCCESS_NOTIFICATION_TOPIC_ARN]
        });
        
        try {
            await cloudWatchClient.send(command);
            console.log
        } catch (error) {
            console.error(`Error creating Memory ${threshold}% alarm for ${instanceId}:`, error);
            throw error;
        }
    }
}

// Create Disk alarms
async function createDiskAlarms(instanceId, instanceDetails) {
    const thresholds = [75, 80, 90];
    
    for (let i = 0; i < thresholds.length; i++) {
        const threshold = thresholds[i];
        
        const command = new PutMetricAlarmCommand({
            AlarmName: `dev-${instanceDetails.instanceName}-${instanceId}-DiskSpaceUtilization-${threshold}`,
            AlarmDescription: `Disk ${threshold}% alarm for ${instanceDetails.instanceName} (${instanceId})`,
            ActionsEnabled: true,
            MetricName: 'disk_used_percent',
            Namespace: 'CWAgent',
            Statistic: 'Average',
            Dimensions: [
                {
                    Name: 'InstanceId',
                    Value: instanceId
                },
                {
                    Name: 'path',
                    Value: '/'
                },
                {
                    Name: 'device',
                    Value: 'nvme0n1p1'
                },
                {
                    Name: 'fstype',
                    Value: 'xfs'
                }
            ],
            Period: 300,
            EvaluationPeriods: 2,
            DatapointsToAlarm: 1,
            Threshold: threshold,
            ComparisonOperator: 'GreaterThanThreshold',
            TreatMissingData: 'notBreaching',
            AlarmActions: [process.env.SUCCESS_NOTIFICATION_TOPIC_ARN]
        });
        
        try {
            await cloudWatchClient.send(command);
            console.log(`Created Disk ${threshold}% alarm for ${instanceId}`);
        } catch (error) {
            console.error(`Error creating Disk ${threshold}% alarm for ${instanceId}:`, error);
            throw error;
        }
    }
}


// Create all alarms for a single instance - NO EMAIL SENT HERE
async function createAlarmsForInstance(instance) {
    const instanceId = instance.InstanceId;
    const instanceDetails = await getInstanceName(instanceId);
    console.log(`Creating alarms for instance: ${instanceId} (${instanceDetails.instanceName})`);
    
    try {
        await createCPUAlarms(instanceId, instanceDetails);
        console.log(`Completed CPU alarms for ${instanceId}`);
        
        await createMemoryAlarms(instanceId, instanceDetails);
        console.log(`Completed Memory alarms for ${instanceId}`);
        
        await createDiskAlarms(instanceId, instanceDetails);
        console.log(`Completed Disk alarms for ${instanceId}`);
        
        console.log(`✅ Successfully completed all alarms for ${instanceId}`);
        return { instanceId, status: 'success', error: null };
        
    } catch (error) {
        console.error(`❌ Error creating alarms for ${instanceId}:`, error);
        return { instanceId, status: 'failed', error: error.message };
    }
}

// Send ONE summary email with all results
async function sendSummaryNotification(results, executionTime) {
    if (!process.env.SUCCESS_NOTIFICATION_TOPIC_ARN) {
        console.log('SUCCESS_NOTIFICATION_TOPIC_ARN not set, skipping summary notification');
        return;
    }

    const successfulInstances = results.filter(r => r.status === 'success');
    const failedInstances = results.filter(r => r.status === 'failed');
    
    let message = `DEV-CloudWatch Auto Alarms - Execution Summary

📊 SUMMARY:
- Total instances processed: ${results.length}
- Successful: ${successfulInstances.length}
- Failed: ${failedInstances.length}
- Execution time: ${Math.round(executionTime / 1000)} seconds

`;

    if (successfulInstances.length > 0) {
        message += `✅ SUCCESSFUL INSTANCES (${successfulInstances.length}):
`;
        successfulInstances.forEach(result => {
            message += `  • ${result.instanceId} - ${result.instaceName} - 9 alarms created (CPU: 3, Memory: 3, Disk: 3)
`;
        });
        message += `
`;
    }

    if (failedInstances.length > 0) {
        message += `❌ FAILED INSTANCES (${failedInstances.length}):
`;
        failedInstances.forEach(result => {
            message += `  • ${result.instanceId} - Error: ${result.error}
`;
        });
        message += `
`;
    }

    message += `🕐 Completed at: ${new Date().toISOString()}

For each successful instance, the following alarms were created:
- CPU Utilization: 70%, 80%, 90% thresholds
- Memory Utilization: 70%, 80%, 90% thresholds  
- Disk Utilization: 70%, 80%, 90% thresholds`;

    const publishParams = {
        TopicArn: process.env.SUCCESS_NOTIFICATION_TOPIC_ARN,
        Message: message,
        Subject: `DEV-CloudWatch Auto Alarms - Summary (${successfulInstances.length}/${results.length} successful)`
    };

    try {
        const result = await snsClient.send(new PublishCommand(publishParams));
        console.log('✅ Summary notification sent! Message ID:', result.MessageId);
    } catch (emailError) {
        console.error('❌ Failed to send summary notification:', emailError);
    }
}

// Send failure notification for overall process failure
async function sendFailureNotification(error, executionTime) {
    if (!process.env.ERROR_NOTIFICATION_TOPIC_ARN) {
        console.log('ERROR_NOTIFICATION_TOPIC_ARN not set, skipping failure notification');
        return;
    }

    const publishParams = {
        TopicArn: process.env.ERROR_NOTIFICATION_TOPIC_ARN,
        Message: `CloudWatch Auto Alarms Lambda function failed completely.

❌ ERROR DETAILS:
${error.message}

Error Type: ${error.name}
Execution Time: ${Math.round(executionTime / 1000)} seconds
Timestamp: ${new Date().toISOString()}

Please check the CloudWatch logs for more details.`,
        Subject: 'CloudWatch Auto Alarms - Complete Failure'
    };

    try {
        await snsClient.send(new PublishCommand(publishParams));
        console.log('Failure notification sent');
    } catch (emailError) {
        console.error('Failed to send failure notification:', emailError);
    }
}

// Main Lambda handler - sends ONE summary email at the end
export const handler = async (event) => {
    console.log('CloudWatch Auto Alarms Lambda started');
    const startTime = Date.now();
    
    try {
        const instances = await getInstances();
        console.log(`Found ${instances.length} running instances to process`);
        
        if (instances.length === 0) {
            console.log('No running instances found');
            
            // Send notification even when no instances found
            if (process.env.SUCCESS_NOTIFICATION_TOPIC_ARN) {
                const publishParams = {
                    TopicArn: process.env.SUCCESS_NOTIFICATION_TOPIC_ARN,
                    Message: `CloudWatch Auto Alarms completed successfully.

No running EC2 instances found to process.

Timestamp: ${new Date().toISOString()}`,
                    Subject: 'CloudWatch Auto Alarms - No Instances Found'
                };
                
                await snsClient.send(new PublishCommand(publishParams));
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No running instances found',
                    processedInstances: 0,
                    executionTime: Date.now() - startTime
                })
            };
        }
        
        const results = [];
        
        // Process instances sequentially
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            const instanceDetails = await getInstanceName(instance.InstanceId);
            console.log(`Processing instance ${i + 1}/${instances.length}: ${instance.InstanceId} (${instanceDetails.instanceName})`);
            
            const result = await createAlarmsForInstance(instance, instanceDetails);
            results.push(result);
            
            if (i < instances.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }        
        
        const executionTime = Date.now() - startTime;
        const successCount = results.filter(r => r.status === 'success').length;
        const failureCount = results.filter(r => r.status === 'failed').length;
        
        console.log(`Processing complete in ${executionTime}ms. Success: ${successCount}, Failures: ${failureCount}`);
        
        // Send ONE summary email with all results
        await sendSummaryNotification(results, executionTime);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'DEV-CloudWatch alarms processing completed',
                totalInstances: instances.length,
                successCount: successCount,
                failureCount: failureCount,
                executionTime: executionTime,
                results: results
            })
        };
        
    } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error('Error in main handler:', error);
        
        // Send overall failure notification
        await sendFailureNotification(error, executionTime);
        
        throw error;
    }
};
