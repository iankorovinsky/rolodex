import './loadEnv';
import app from './app';
import config from './config/config';

app.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port} in ${config.nodeEnv} mode`);
});
