# Project Title

AWS Identity Center Implementation

## Description

AWS SSO is now known as AWS IAM Identity Center.  AWS IAM Identity Center allows all users to access multiple environments in one place through one login.  AWS Identity Center is integrated with Microsoft Active Directory, which is in use with our IT Department.  AWS Identity Center merges with SAML and Federated formats that are used in other IT-driven services like Microsoft Active Directory.  We will continue to manage the IAM Console for service accounts not migrated into Identity Center.  The major impact is the passwordless entry through the SSO to confirm the user using Microsoft Active Directory under a unified portal.

## Getting Started
User setup is done in two parts in concert with the IT Department:

1. When a user is created in the Microsoft Active Directory, it will take about 60 minutes or less to sync with the AWS Identity Center.

2. The IT Department will create the basics of the user’s profile, assign a group to them and,  connect with AWS.

3. Once the new user is synced with AWS Identity Center, the AWS administrator will confirm the group and permission sets are correct.

4. If a user needs to change groups, we will relay that information to IT to make those changes.

5. If a user or group needs new permissions, that were not previously configured by IT/AWS Admin, a Jira ticket is filed and the AWS administrator will amend the permissions.

### Dependencies

* IAM was already in place but an SSO was required due to NIST compliance.

### Installing

* How/where to download your program
* Any modifications needed to be made to files/folders

### Executing program

* How to run the program
* Step-by-step bullets
```
code blocks for commands
Found on the page labeled "Code Examples(JSON)

![Diagram](portfolio/assets/AWS Identity Center Diagram.jpg)
