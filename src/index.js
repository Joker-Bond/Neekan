import { express } from 'express';

const app = express();

app.listen(8000, () => {
  console.log('app is starting at port 8000');
});
