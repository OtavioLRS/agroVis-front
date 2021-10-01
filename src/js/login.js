import "@babel/polyfill";

document.getElementById('loginButton').addEventListener('click', () => {
  handleLogin();
})

async function handleLogin() {
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('loginLoader').classList.remove('hidden');

  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;

  const response = await fetch('https://mighty-taiga-07455.herokuapp.com/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const user = await response.json();

  // console.log(user);

  if (user.msg) {
    document.getElementById('loginLoader').classList.add('hidden');
    document.getElementById('loginError').innerHTML = user.msg;
    document.getElementById('loginError').classList.remove('hidden');
  }
  else {
    document.getElementById('loginError').classList.add('hidden');
    console.log('caralho')
    document.getElementById('homeHref').click();
  }
}