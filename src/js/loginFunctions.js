// Valida o login
export async function validateLogin() {
  const session = await localStorage.getItem('session');

  // Se tiver session, vai para a home, senão, permanece no login
  if (session != null) document.getElementById('homeHref').click();
}

// Valida o login na home
export async function validateLoginInHome() {
  const session = await localStorage.getItem('session');

  // Se tiver session, continua na home, senão, volta ao login
  if (session == null) document.getElementById('logout-link').click();
}

export async function handleLogin() {
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
    await localStorage.setItem('session', JSON.stringify(user));

    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('homeHref').click();
  }
}