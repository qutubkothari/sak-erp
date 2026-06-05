async function testLogin() {
  try {
    const res = await fetch('https://pms.saksolution.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'erpsak53@gmail.com', password: 'test' })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
testLogin();
