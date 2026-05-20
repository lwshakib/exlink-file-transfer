import express, { type Express } from 'express';

const app: Express = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

export default app;
