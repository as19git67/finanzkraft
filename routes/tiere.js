import { AsRouteConfig } from 'as-express';

/* POST authenticate and create new access token */
//export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
  res.json({gattungen: ['Schneeleopard', 'Pantherkatze', 'Jaguar', 'Leopard', 'Löwe', 'Tiger', 'Altkatze', 'Marmorkatze', 'Goldkatze', 'Luchs', 'Schlankkatze', 'Wieselkatze']});
});
