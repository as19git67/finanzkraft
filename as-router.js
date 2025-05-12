export default class AsRouteConfig {

  constructor(path) {
    this.path = path;
    this.routes = {};
  }

  #setup(handler, options, verb) {
    this.routes[verb] = {
      handler,
      bypassAuth: options.bypassAuth,
    };
  }

  get(handler, options = { bypassAuth: false }) {
    this.#setup(handler, options, 'get');
    return this;
  }

  post(handler, options = { bypassAuth: false }) {
    this.#setup(handler, options, 'post');
    return this;
  }

  put(handler, options = { bypassAuth: false }) {
    this.#setup(handler, options, 'put');
    return this;
  }

  delete(handler, options = { bypassAuth: false }) {
    this.#setup(handler, options, 'delete');
    return this;
  }
}
