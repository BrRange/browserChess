async function askServer(command) {
  const res = await fetch(command);
  const obj = await res.json();
  return obj;
}

askServer("getUserId").then(obj => console.log(obj));

askServer("getBoard").then(obj => console.log(obj));