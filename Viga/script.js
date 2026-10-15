const formulario = document.getElementById("registroForm");


formulario.addEventListener("submit", function(e){


e.preventDefault();



const usuario = {


identificacion:
document.getElementById("identificacion").value,


nombres:
document.getElementById("nombres").value,


apellidos:
document.getElementById("apellidos").value,


fecha_nacimiento:
document.getElementById("fecha_nacimiento").value,


telefono:
document.getElementById("telefono").value,


correo:
document.getElementById("correo").value,


password:
document.getElementById("password").value


};





fetch("http://localhost:3000/registro",{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify(usuario)



})


.then(res=>res.json())


.then(data=>{


document.getElementById("mensaje").innerHTML=data.mensaje;


formulario.reset();


})


.catch(error=>{


console.log(error);


document.getElementById("mensaje").innerHTML=
"Error al conectar con el servidor";


});



});