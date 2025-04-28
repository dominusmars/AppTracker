# App Tracker

## Description

Simple application to track job applications and gives updates on the status of each application. It uses Ollama to generate status by reading incoming emails from imap and sending them to the model. The model then gives back a respond with the status of the application. A discord notification is sent to the user with the current status of the job.

## Features

-   Track job applications
-   Get updates on the status of each application
-   Uses Bayesian classifier to classify emails as job updates or not
-   Uses Ollama to generate status by reading incoming emails from imap and sending them to the model
-   Sends discord notification to the user with the current status of the job
-   Uses MongoDB to store job applications and their status

## Requirements

-   Ollama Server
-   MongoDB
-   Discord Bot Token
-   IMAP capabile email account (Gmail, Outlook, etc.)

## Installation

Clone the repository and install the required packages:

```bash
git clone
```

Start by making a ollama server and a discord bot. You can find instructions on how to do this in the [Ollama documentation](https://ollama.com/docs/getting-started) and [Discord documentation](https://discord.com/developers/docs/intro).

Install a model on the ollama server. I've been using the [Llama3](https://ollama.com/library/llama3.2) model, but you can use any model you want. Just make sure to set the OLLAMA_MODEL environment variable to the model you want to use.

For the discord bot, your gonna need to allow it the following permissions set:

-   Message Content Intent

This allows the bot to send messages to the user with the current status of the job.
After that, add the bot as a allowed application on your discord account.

Your gonna need to get the bot token and your discord user id. You can find instructions on how to do this in the [Discord documentation](https://discord.com/developers/docs/getting-started).

Next, if your using a google account, you need to create a app password. You can find instructions on how to do this in the [Google documentation](https://support.google.com/accounts/answer/185833). Note: You need to have 2FA enabled on your account to create a app password.

After that, create a .env file in the root directory of the project and add the following variables:

```bash
DISCORD_TOKEN=your_discord_token
DISCORD_USER_ID=your_discord_user_id
IMAP_EMAIL=your_email_address
IMAP_PASSWORD=your_email_password
IMAP_SERVER=your_imap_server
VERBOSE=Only_for_debugging # Set to true to enable verbose logging
OLLAMA_MODEL=llama3.2 # Set to the model you want to use
OLLAMA_SERVER=http://127.0.0.1:11434/ # Set to the url of your ollama server
MONGO_URI=mongodb://localhost:27017 # Set to the url of your mongo db server
```

Once you have all the variables set, npm install the required packages:

```bash
npm install
```

Then, run the following command to start the application:

```bash
npm start
```

## TODO

-   Add a web interface to track job applications
-   Add Discord commands
-   Add Docker support
-   Do some refactoring to make the code more readable and maintainable

## Motivation

I got really tired of manually checking my emails for job updates, it felt like a waste of time. And knowing that most employers were using AI to filter out candidates, was definitely making me feel discourged. So I decided to make a simple application which would help me track all my job applications and keep me updated on the status of each of them. Plus it allowed me to learn more about how I can apply AI to my own life. I hope this application helps you as much as it helped me.
