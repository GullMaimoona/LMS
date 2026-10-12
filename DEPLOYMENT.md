# Deploy on Render (beginner steps)

This project uses a React frontend, an Express API, and MongoDB. Render hosts the frontend and API; MongoDB Atlas hosts the database.

## 1. Put the project on GitHub

Create a GitHub account if needed, create a repository, and upload the contents of this project (`student-management`). Keep `.env` files and database passwords out of GitHub. The provided `.env.example` files are safe templates.

## 2. Create a MongoDB Atlas database

Create a free Atlas cluster and a database user with a strong password. In Atlas Network Access, allow `0.0.0.0/0` so Render can connect. Copy the Atlas application connection string, replace its password placeholder, and include the database name `studentDB`, for example:

`mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/studentDB?retryWrites=true&w=majority`

Keep this URI private.

## 3. Create both Render services

In Render, choose **New → Blueprint**, connect the GitHub repository, and select the `student-management/render.yaml` Blueprint file. When prompted, paste the Atlas URI for `MONGODB_URI`. Render generates `JWT_SECRET` automatically. Review the two services and create them.

## 4. Point the frontend at the API

After the API service is live, open it in Render and copy its public URL (it ends in `.onrender.com`). Open the `student-management-frontend` service, go to **Environment**, and set `VITE_API_URL` to that URL, with no `/api` at the end; for example `https://student-management-api.onrender.com`. Save the change and manually deploy the frontend so Vite rebuilds with the API URL.

## 5. Create the first admin

In the Render dashboard, open the API service's **Shell** and run:

```sh
ADMIN_NAME="System Admin" ADMIN_EMAIL="your-email@example.com" ADMIN_PASSWORD="use-a-long-private-password" npm run create-admin
```

Use your chosen email and a strong password. Then open the frontend's public URL and log in.

## Notes

- The first free API request after idle may take a little while because the service can sleep.
- Do not commit secrets or share the MongoDB connection string.
- The API currently allows browser requests from any origin. Restricting that to the frontend domain is a useful follow-up once its Render URL is known.
