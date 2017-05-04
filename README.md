# BitScoop Social Login Demo

This demo will show you how to set up a simple user management system on AWS using API Gateway, RDS, S3, VPC, and Lambda.
The Lambda code uses the BitScoop platform to streamline implementation of a social login workflow using GitHub.

## Create a GitHub account, add API map to BitScoop, and set up authorization

| API Map   | File Name       |                                                                                                                                                                                                                                    |
|----------------|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Facebook Social Login | facebook.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-login-demo/master/fixtures/maps/facebook.json) |
| GitHub Social Login | github.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-login-demo/master/fixtures/maps/github.json) |
| Google Social Login | google.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-login-demo/master/fixtures/maps/google.json) |
| Twitter Social Login | twitter.json | [![Add to BitScoop](https://assets.bitscoop.com/github/AddBitScoopXSmall.png)](https://bitscoop.com/maps/create?source=https://raw.githubusercontent.com/bitscooplabs/bitscoop-social-login-demo/master/fixtures/maps/twitter.json) |

For each of the four services, add the GitHub API map included in the fixtures/maps folder in this project to your BitScoop account.
You will get auth_key and auth_secret for each Map in a bit, while the redirect_url will be updated later; for now, leave them as is.
When each Map is added, you should be redirected to the details page for the Map, and under Authentication you should see ‘Callback URL’, which you’ll need to use in that service's respective next steps.
Also take note of each Map’s ID, which will be used later as an Environment Variable when setting up the Lambda function that will serve the backend views.

#### Facebook

Create a developer account with Facebook if you don’t have one already.
When you’re signed in, go to [your apps page](https://developers.facebook.com/apps).
Click on Add a New App.
Enter a name for this app and click Create App ID, then solve the Captcha if asked.
You should be taken to the Add Product page for the new app.

Click the ‘Get Started’ button for Facebook Login.
This should add it to the list of Products at the bottom of the left-hand menu.
We don’t need to go through their quickstart, so click on the Login product and then go to its Settings.
Copy the Map’s Callback URL into ‘Valid OAuth redirect URIs’ and make sure to Save Changes.
Now go to the app’s Basic Settings and copy the App ID and App Secret into ‘auth_key’ and ‘auth_secret’, respectively, in the auth portion of Map, then save the Map.

#### GitHub

Create an account with GitHub if you don’t have one already.
When you’re signed in, go to [your developer settings page](https://github.com/settings/developers).
Click on Register a New Application.
Enter a name and homepage URL, and copy the Callback URL from the previous step into ‘Authorization callback URL’.
Click Register Application.
You should be taken to the settings for the application you just made.
Go back to the details for the API map and click ‘Source’ in the upper right to edit the map.
Copy the Client ID and Client Secret from the GitHub application into ‘auth_key’ and ‘auth_secret’, respectively, in the ‘auth’ portion of the Map, then save the Map.

#### Google

Create a developer account with Google if you haven’t already.
Create a new project, then go to the [Google API Console for People](https://console.developers.google.com/apis/api/people.googleapis.com/overview) and make sure the People API is enabled.
Next click on 'Credentials' on the left-hand side, underneath 'Dashboard' and 'Library'.
Click on the blue button 'Create Credentials' and select 'OAuth client id'.
Choose application type 'Web application', then in 'Authorized redirect URIs' enter the Callback URL that can be found on the Details page for the Map you created for Google.
Click 'Create' twice; it should show a pop-up with your client ID and secret.
Copy these into ‘auth_key’ and ‘auth_secret’, respectively, in the auth portion of the Map, then save the Map.

#### Twitter

Create an account with Twitter if you haven’t already. Go to [your apps](https://apps.twitter.com/) and click Create New App.
Enter a name, description, and website, then copy the Callback URL from the Map into the ‘Callback URL’ field.
Check the Developer Agreement and then click the Create button.

Go to the Permissions tab and change Access to ‘Read only’ (not necessary, but this demo doesn’t need write or direct message permissions).
Next go to the Keys and Access Tokens tab.
Copy the Consumer Key and Consumer Secret into ‘auth_key’ and ‘auth_secret’, respectively, in the ‘auth’ portion of the Map, then save the Map.


Make sure that you have created an API key for BitScoop, as all calls to the BitScoop API must be signed with one.
Once you've created it, go to the key's Details and enable all of the scopes, as by default BitScoop keys have no scopes enabled.

## Install dependencies

You will need to have node.js and `npm` installed on your machine so that you can compile and bundle the backend code before uploading it to Lambda.
You will also be building the static files necessary to run the front end.

From the top level of this project run

```
npm install
```

Then go to the src/ directory and again run

```
npm install
```

## Set up an RDS box and configure networking
There are several AWS services that need to be set up to run this demo.
We’re first going to tackle the networking and creating the SQL server that will hold our user database.
We’re going to create everything from scratch so that you don’t interfere with anything you may already have in AWS.

Go to [IAM roles](https://console.aws.amazon.com/iam/home#/roles) and create a new role. Click Select next to AWS Lambda.
You will need to add three policies to this role:
AWSLambdaBasicExecution
AWSLambdaCloudFormation
AWSLambdaVPCAccessExecution

Click Next Step, give the role a name, and then click Create Role.
This role will be used by the Lambda function to specify what it has permission to access.

Go to your [VPCs](https://console.aws.amazon.com/vpc/home#vpcs:) and create a new one.
Tag it with something like ‘bitscoop-demo’ so you can easily identify it later.
For the IPv4 CIDR block, enter 10.0.0.0/16, or something similar if that is already taken.
Leave IPv6 CIDR block and tenancy as their defaults and create the VPC.

View your [Subnets](https://console.aws.amazon.com/vpc/home#subnets).
You should create four new subnets.
Two of these will be public subnets, and two will be private.
Call the public ones ‘public1’ and ‘public2’, and the private ones ‘private1’ and ‘private2’.
Make sure they are all on the ‘bitscoop-demo’ VPC we created.
One public and one private subnet should be in the same availability zone, and the other public and private subnets should be in different AZs, e.g. public1 in us-east-1a, public2 in us-east-1c, private1 in us-east-1a, and private2 in us-east-1b.
Remember which AZ is shared between a public and private subnet for later.
The CIDR block needs to be different for each subnet and they all need to fall within the CIDR block of the VPC; if the VPC block is 10.0.0.0/16, you could use 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24, and 10.0.3.0/24.
AWS will let you know if anything overlaps.

Go view your [NAT Gateways](https://console.aws.amazon.com/vpc/home#NatGateways).
Create a new Gateway, and for the subnet pick the public subnet that shares an AZ with a private subnet, e.g. ‘public1’ in the example above.
Click Create New EIP and then Create the gateway.
This new gateway should have an ID nat-<ID>.
It should be noted that, while almost everything in this demo is part of AWS’ free tier, NAT gateways are NOT free.
They’re pretty cheap, at about $0.05 per hour and $0.05 per GB of data processed, but don’t forget to delete this when you’re done with the demo (and don’t forget to create a new one and point the private route table to the new one if you revisit this demo).

Go to [Route Tables](https://console.aws.amazon.com/vpc/home#routetables) and create two new ones.
Name one ‘public’ and the other ‘private’, and make sure they’re in the ‘bitscoop-demo’ VPC.
When they’re created, click on the ‘private’ one and select the Routes tab at the bottom of the page.
Click Edit, and add another route with a destination of 0.0.0.0/0 and a target of the NAT gateway we just created (so nat-<ID>, not igw-<ID>).
Save the private route table.

Go back to the subnets and click on one of the ‘private’ ones.
Click on the Route Table tab, click Edit, and change it in the dropdown to the ‘private’ Route Table that you created in the previous step.
Then click Save.
Repeat this for the other ‘private’ subnet.

You also need to create a couple of [Security Groups](https://console.aws.amazon.com/vpc/home#securityGroups:).
Name the first one ‘rds’ and make sure it’s in the ‘bitscoop-demo’ VPC, then create it.
Click on it in the list, click on the Inbound Rules tab, and then click Edit.
You’ll want to add a MySQL/Aurora rule (port 3306) for 10.0.0.0/16 (or whatever CIDR block you picked for the VPC) so Lambda can access the RDS box internally.
If you want to make sure that the box you’re going to set up is working as intended, you can also add a MySQL/Aurora rule for your IP address.
You do not need to add any Outbound Rules.

You also need to add a Security Group called ‘lambda’.
This does not need any Inbound Rules, but it does need Outbound Rules for HTTP (80) to 0.0.0.0/0 and HTTPS (443) to 0.0.0.0/0.

Finally, you will set up the [RDS](https://console.aws.amazon.com/rds/home) box to store the data that will be generated.
Click on Instances and select Launch DB Instance.
For this demo we are using MySQL; if you wish to use a different database, you may have to install a different library in the demo project and change the Sequelize dialect to that db.

Click on MySQL (or whatever Engine you want) and then click the Select button next to the version you wish to use (MySQL only has one version as of this publication).
On the ‘Production?’ page we recommend selecting the Dev/Test instance of MySQL to minimize the cost to you; test instances can be run cost-free as part of AWS’ free tier.
Click Next Step to go to ‘Specify DB Details’.
On this page you can click the checkbox ‘Only show options that are eligible for RDS Free Tier’ to ensure you don’t configure a box that costs money.

Select a DB Instance class; db.t2.micro is normally free and should be sufficient for this demo, as should the default storage amount (5GB as of publication).
Pick a DB Instance Identifier, as well as a username and password.
Save the latter two for later reference, as you will need to set Environment Variables in the Lambda function for them so that the function can connect to the DB.
Click Next Step.

On the Advanced Settings screen, select the ‘bitscoop-demo’ VPC.
Under VPC Security Group(s), select the ‘rds’ group we created earlier.
Make sure to give the database a name and save this name for later use, as it too will need to be added to an Environment Variable.
Also make sure the box is publicly accessible, and make sure the Availability Zone is the one that’s shared between a public and private subnet (us-east-1a in the above example).
Click Launch DB Instance.

Go to your [RDS instances](https://console.aws.amazon.com/rds/home#dbinstances).
When the box you just created is ready, click Instance Actions, then See Details.
Look at the second column, Security and Network.
Take note of the Endpoint field near the bottom.
Save this for later use, as it will be used in another Environment Variable.

## Deploy API code to Amazon Lambda, create API Gateway, deploy static files to S3
With all of the networking squared away, we now need to upload all of our project files to the appropriate services.

First we’re going to create a Lambda function to serve as the backend API views for rendering the main page, signing up new users, logging users in and out, and handling callbacks from the authentication process.
Go to your [Lambda functions](https://console.aws.amazon.com/lambda/home#/functions?display=list) and Create a new function.
Select ‘Blank Function’ for the blueprint.
Don’t select any triggers, just click Next.
Name the function; for reference we’ll call this ‘social-login-demo’.
Make sure the runtime is ‘Node.js 6.10’.
Leave the Code Entry Type as ‘Edit Code inline’, as we need to modify the project’s code with some information we don’t have yet before we can upload it.
Select the ‘demo’ service role we created earlier and make sure the handler is ‘index.handler’.

You will need to add several Environment Variables:

* BITSCOOP_API_KEY (obtainable at https://bitscoop.com/keys)
* PORT (by default it’s 3306)
* HOST (the endpoint for the RDS box, <Box name>.<ID>.<Region>.rds.amazonaws.com)
* USER (the username you picked for the RDS box)
* PASSWORD (the password you set for the RDS box)
* DATABASE (the database name you set for the RDS box)
* FACEBOOK_MAP_ID (the ID of the BitScoop API map for Facebook)
* GITHUB_MAP_ID (the ID of the BitScoop API map for GitHub)
* GOOGLE_MAP_ID (the ID of the BitScoop API map for Google)
* TWITTER_MAP_ID (the ID of the BitScoop API map for Twitter)
* SITE_DOMAIN (The domain of the API gateway; this will be filled in later)

Open the Advanced Settings and set the timeout to 10 seconds to give the function some breathing room.
Select the ‘demo’ VPC we created and add the two ‘private’ subnets we created earlier.
Add the ‘lambda’ security group, then click Next.
After reviewing everything on the next page, click ‘Create function’.

Next we will create an API gateway to handle traffic to the endpoints that will serve up the views for this project.
Go to the [API Gateway home](https://console.aws.amazon.com/apigateway/home) and click Get Started.
Name the API whatever you want; for reference purposes we’ll call it ‘social-login-demo’.
Make sure the type is ‘New API’ and then click Create.

You should be taken to the API you just created.
Click on the Resources link if you aren’t there already.
Highlight the resource ‘/’ (it should be the only one present), click on the Actions dropdown and select ‘Create Method’.
Click on the blank dropdown that appears and select the method ‘GET’, then click the checkbox next to it.
Make sure the Integration Type is ‘Lambda Function’.
Check ‘Use Lambda Proxy integration’, select the region your Lambda function is in, and enter the name of that Lambda function, then click Save.
Accept the request to give the API gateway permission to access the Lambda function.

What we’ve just done is configure GET requests to the ‘/’ path on our API to point to the Lambda function that has all of the project’s views.
Unlike the data visualization demo, you don’t need to modify the method’s integration, request, or response.
We’re using API Gateway’s Proxy integration, which passes parameters and headers as-is on both requests to and responses from the Lambda function.

We next need to add sub-routes for our other views.
Select the ‘/’ resource, then click the Actions dropdown and select ‘Create Resource’.
Enter ‘login’ for the Resource Name, and the Resource Path should be filled in with this automatically as well, which is what we want.
Leave the checkboxes unchecked and click the Create Resource button.
When that’s been created, click on the ‘/login’ resource and follow the steps above for adding a GET method to that resource.
Repeat this process for the resources ‘logout’, ‘complete’, and ‘signup’.

When you’ve done all of that, you should have one top-level resource ‘/’ and four resources under that, ‘/complete’, ‘/login’, ‘/logout’, and ‘/signup’.
Click on the ‘/’ resource, then click on the Actions dropdown and select ‘Deploy API’.
For Deployment Stage select ‘New Stage’ and give it a name; we suggest ‘dev’, but it can be anything.
You can leave both descriptions blank.
Click Deploy when you’re done.

The final thing to do is get the URL at which this API is available.
Click ‘Stages’ on the far left, underneath the ‘Resources’ of this API.
Click on the stage you just created.
The URL should be shown as the ‘Invoke URL’ in the top middle of the page on a blue background.

You need to copy this URL into a few places.
One is the SITE_DOMAIN Environment Variable in the Lambda function (don’t forget to Save the Lambda function).
Two others are the invokeUrl variable near the top of src/views/login.js and src/views/signup.js; replace ‘***INSERT INVOKE URL HERE***’ with the actual URL.
Lastly, you need to edit the GitHub API map and insert it into the redirect URL in the auth block.
Make sure to leave the ‘/complete’ portion there; only replace the starred part of the string.
The redirect URL should look something like ‘https://abcde12345.execute-api.us-east-1.amazonaws.com/dev/complete’.
Make sure to save the map.

Navigate to the top level of the project and run

```
gulp build
```

to compile and package all of the static files to the dist/ folder.

Next we’re going to create an S3 bucket to host our static files.
Go to S3 and create a new bucket.
Give it a name and select the region that’s closest to you, then click Next.
You can leave Versioning, Logging, and Tags disabled, so click Next.
Open the ‘Manage Group Permissions’ accordion and give Everyone Read access to Objects (NOT Object Permissions).
Click Next, review everything, then click Create Bucket.

Click on the new bucket, then go to the Objects tab and click Upload to have a modal appear.
Click Add Files in this modal and navigate to the ‘dist’ directory in the bitscoop-data-visualizer-demo directory, then into the directory below that (it’s a unix timestamp of when the build process was completed).
Move the file system window so that you can see the Upload modal.
Click and drag the static folder over the Upload modal (S3 requires that you drag-and-drop folders, and this only works in Chrome and Firefox).
Close the file system window, then click Next.
Open the ‘Manage Group Permissions’ accordion and give Everyone read access to Objects.
Click Next, then Next again, then review everything and click Upload.

Lastly, go to src/templates/home.html and replace ***INSERT S3 BUCKET NAME HERE*** with the name of the S3 bucket you created earlier.
From the top level of the project run

```
gulp bundle
```

to compile the code for the Lambda function to the dist/ folder.
Go to the Lambda function we created earlier, click on the Code tab, then for ‘Code entry type’ select ‘Upload a .ZIP file’.
Click on the Upload button that appears next to ‘Function package’ and select the .zip file in the /dist folder.
Make sure to Save the function.

If all has gone well, you should be able to hit the Invoke URL and see a page asking you to log in or sign up.
If you click on a sign up button, you should be redirected to a prompt from that service authorizing the application that was created to have access to your public info.
After authorization, you should be redirected back to the homepage, where you now have an account with the demo project that has information populated from that service's account.
If you log out, then click log in for that service, you should be automatically logged back in, though some services may require you to re-authorize.
