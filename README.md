# feed.back

## Install
1. In Chrome, navigate to chrome://extensions
2. Download/clone this repository
3. Drag folder into chrome window


## How to Use
1. Navigate to news article
2. Click on newspaper chrome extension icon

## Running Python backend in development
This application connects to a Python backend to communicate with the SQL instance deployed in Google Cloud.

First, install the dependencies via the included requirements.txt

To run the backend in development, you must install the Google Cloud SDK and App Engine SDK for Python.

Then, navigate into the "rest app" directory and run "dev_appserver app.yaml" to state it in development mode.

To allow it to communicate with the cloud database in development, you must use the [SQL proxy](https://cloud.google.com/sql/docs/mysql/sql-proxy). 