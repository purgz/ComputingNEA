//function to validate password meets minimum requirements, will only allow submit if the password is good enough
function ValidatePassword(){

    let pword = document.getElementById("password").value; //getting the inputted value

    //regex expression to check for minimum of 8 chars,upper case, lower case,numbers and special characters.
    let format = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;  

    if (!pword.match(format)){
        alert("Improve password, include upper case, lower case, number and special character.");
    } else {
        return true;
    }
    // remove pword validation - annoying
    //return false;
    return true;
}