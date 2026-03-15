# How do you set up the backend?

~~idk actually~~

Dear ~~mf~~ dev, welcome to the guide that helps you configure the backend of our fucking and incredible messenger!

## Steps

First, install PostgreSQL. Make sure you select the option "install pgAdmin 4" during the installation. This will install the UI for Postgres. Choose this option unless you wanna be fucked up by the command prompt.

Second, in pgAdmin 4, open and run all the script in the Database folder to create the database itself, the required tables and fill them with some rows.

Third, configure the connection string in the appsettings.json file. Specify the actual path to the datadase you just created.

Fourth, run the backend using the "dotnet run" command in the project's root folder.

Dumb note: i believe this damn bullshit will work.

Thanks for reading! Hope you managed to go through all the steps without dying from doing these terrible things.
