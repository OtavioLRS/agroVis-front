import "@babel/polyfill";
import { handleLogin, validateLogin } from "./loginFunctions";

document.getElementById('loginButton').addEventListener('click', () => {
  handleLogin();
});

validateLogin();