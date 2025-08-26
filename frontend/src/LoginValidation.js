function validation(values)
{
    let errors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!values.email) {
        errors.email = "Email is required";
    }
    else if (!emailPattern.test(values.email)) {
        errors.email = "Invalid email format";
    }
    else{
        errors.email = "";
    }
    if (!values.password) {
        errors.password = "Password is required";
    }
    else{
        errors.password = "";
    }
    return errors;
    
}
export default validation;