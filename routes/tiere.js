import { AsRouteConfig } from 'as-express';

//export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
export default new AsRouteConfig().get('/gattung/', function (req, res, next) {
  res.json({gattungen: ['Schneeleopard', 'Pantherkatze', 'Jaguar', 'Leopard', 'Löwe', 'Tiger', 'Altkatze', 'Marmorkatze', 'Goldkatze', 'Luchs', 'Schlankkatze', 'Wieselkatze']});
});
