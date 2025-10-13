import axios from 'axios';
import { clientServer } from '../../Config';
import './style.css';
import { useState } from "react";
import { useNavigate } from 'react-router-dom';

export default function SignInComponent(){
    const navigate=useNavigate();

    const [inSignUpMode,setInSignUpMode]=useState(false);
    const [name,setName]=useState("");
    const[username,setUserName]=useState("");
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const [role,setRole]=useState("");

    const [displayMessage,setDisplayMessage]=useState("");

    const handleSignUp=async ()=>{
        try{
            const response=await clientServer.post('/api/user/register',{
                name,
                username,
                email,
                password,
                role
            });
            setEmail("");
            setUserName("");
            setName("");
            setPassword("");
            setRole("");
            setDisplayMessage(`${response.data.message} Please Login`);
        }catch(error){    
            if(axios.isAxiosError(error) && error.response?.data?.message){
                setDisplayMessage(error.response.data.message);
            }else{
               setDisplayMessage("Something went wrong. Please try again.");
            }
        }finally{
            setTimeout(()=>{
                setDisplayMessage("");
            },2000);
        }
    }

    const handleSignIn=async ()=>{
        console.log(email,password,role);
        try{
            const response=await clientServer.post('/api/user/login',{
                username,
                email,
                password,
                role
            });
            setUserName("");
            setEmail("");
            setPassword("");
            setRole("");
            setDisplayMessage(response.data.message);
            localStorage.setItem('token',response.data.token);
        }catch(error){
            if(axios.isAxiosError(error) && error.response?.data?.message){
                setDisplayMessage(error.response.data.message);
            }else{
                setDisplayMessage("Something went wrong. Please try again.");
            }
        }finally{
            setTimeout(()=>{
                setDisplayMessage("");
                navigate('/dashboard');
            },2000);
        }
    }

    return(
        <div className="mainContainer">
            <div className={`signIn_mainContainer ${inSignUpMode?"sign-up-mode":""}`}>
                {!inSignUpMode?
                <div className="singIn_mainContainerLeft">
                    <p>{displayMessage}</p>
                    <h1 className="text-5xl font-medium text-center">Sign in</h1>
                    <input type="text" className="inputFields" placeholder="UserName" name='username' onChange={(e)=>setUserName(e.target.value)} value={username} required />
                    <input className="inputFields" type="text" placeholder="Email" name='email' onChange={(e)=>setEmail(e.target.value)} value={email} required />
                    <input className="inputFields" type="password" placeholder="Password" name='password' onChange={(e)=>setPassword(e.target.value)} value={password} required />
                    <div className='inputRadios'>
                        <label>
                            <input type="radio" name="role" value="User" checked={role === "User"} onChange={(e) => setRole(e.target.value)} />
                            User
                        </label>

                        <label>
                            <input type="radio" name="role" value="Admin" checked={role === "Admin"} onChange={(e) => setRole(e.target.value)} />
                            Admin
                        </label>
                    </div>
                     <div className="SignInButton" onClick={()=>handleSignIn()}>SIGN IN</div>
                </div>
                :
                <div className="singUp_mainContainerLeft">
                    <h1 className="text-7xl">Already Have,</h1>
                    <h1 className="text-6xl">Account!</h1>
                    <div onClick={()=>setInSignUpMode(false)} className="SignUpButton">SIGN IN</div>
                </div>
                }
                {!inSignUpMode?
                <div className="singIn_mainContainerRight">
                    <h1 className="text-7xl">Create,</h1>
                    <h1 className="text-6xl">Account!</h1>
                    <p className="text-2xl">Sign up if you still dont't have an account ...</p>
                    <div onClick={()=>setInSignUpMode(true)} className="SignUpButton">SIGN UP</div>
                </div>
                :
                <div className="singUp_mainContainerRight">
                    {displayMessage.length>0 && <p className='pt-2 text-[1rem]'>{displayMessage}</p>}
                    <h1 className="text-5xl font-medium text-center">Sign Up</h1>
                    <input type="text" className='inputFields' placeholder='Name' name='Name' onChange={(e)=>setName(e.target.value)} value={name} required />
                    <input type="text" className="inputFields" placeholder="UserName" name='username' onChange={(e)=>setUserName(e.target.value)} value={username} required />
                    <input className="inputFields" type="text" placeholder="Email" name='email' onChange={(e)=>setEmail(e.target.value)} required value={email} />
                    <input className="inputFields" type="password" placeholder="Password" name='password' onChange={(e)=>setPassword(e.target.value)} value={password} required />
                    <div className='inputRadios'>
                        <label>
                            <input type="radio" name="role" value="User" checked={role === "User"} onChange={(e) => setRole(e.target.value)} />
                            User
                        </label>

                        <label>
                            <input type="radio" name="role" value="Admin" checked={role === "Admin"} onChange={(e) => setRole(e.target.value)} />
                            Admin
                        </label>
                    </div>
                     <div className="SignInButton" onClick={()=>handleSignUp()}>SIGN UP</div>
                </div>
                }
            </div>
        </div>
    )
}