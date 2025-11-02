import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, LogIn, Mail, Lock, User, UserCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
        if (!name || !email || !password) {
            setDisplayMessage("Please fill in all fields");
            setTimeout(() => setDisplayMessage(""), 3000);
            return;
        }

        try{
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        username: username || email.split('@')[0],
                        role: role || 'User'
                    }
                }
            });

            if (error) {
                setDisplayMessage(error.message);
            } else {
                setDisplayMessage("Account created successfully! Please check your email to verify.");
                setEmail("");
                setUserName("");
                setName("");
                setPassword("");
                setRole("");
                setTimeout(() => {
                    setInSignUpMode(false);
                }, 3000);
            }
        }catch(error){    
            setDisplayMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
        }finally{
            setTimeout(()=>{
                setDisplayMessage("");
            }, 5000);
        }
    }

    const handleSignIn=async ()=>{
        if (!email || !password) {
            setDisplayMessage("Please fill in all fields");
            setTimeout(() => setDisplayMessage(""), 3000);
            return;
        }

        try{
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setDisplayMessage(error.message);
            } else if (data.session) {
                // Store the session token
                localStorage.setItem('supabase_token', data.session.access_token);
                localStorage.setItem('user_id', data.user.id);
                
                setUserName("");
                setEmail("");
                setPassword("");
                setRole("");
                setDisplayMessage("Login successful! Redirecting...");
                
                setTimeout(()=>{
                    navigate('/dashboard');
                }, 1500);
            }
        }catch(error){
            setDisplayMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
        }finally{
            setTimeout(()=>{
                setDisplayMessage("");
            }, 3000);
        }
    }

    return(
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield className="w-12 h-12 text-purple-400" />
                        <h1 className="text-5xl font-bold text-white">FinScope</h1>
                    </div>
                    <p className="text-purple-300 text-lg">Secure Banking Analytics Platform</p>
                </div>

                {/* Main Container */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-0">
                        
                        {/* Sign In Form */}
                        {!inSignUpMode ? (
                            <div className="p-10 space-y-6">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
                                        <LogIn className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-white mb-2">Welcome Back</h2>
                                    <p className="text-purple-300">Sign in to your account</p>
                                </div>

                                {displayMessage && (
                                    <div className="bg-purple-500/20 border border-purple-400/50 text-purple-200 px-4 py-3 rounded-xl text-center">
                                        {displayMessage}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="relative">
                                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUserName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="email"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="password"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-6 justify-center py-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="User"
                                                checked={role === "User"}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-4 h-4 text-purple-500 focus:ring-purple-400"
                                            />
                                            <span className="text-white font-medium">User</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="Admin"
                                                checked={role === "Admin"}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-4 h-4 text-purple-500 focus:ring-purple-400"
                                            />
                                            <span className="text-white font-medium">Admin</span>
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleSignIn}
                                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 group"
                                    >
                                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-sm flex flex-col justify-center items-center text-center">
                                <UserPlus className="w-20 h-20 text-white mb-6" />
                                <h2 className="text-5xl font-bold text-white mb-4">Already Have</h2>
                                <h3 className="text-4xl font-bold text-white mb-6">An Account?</h3>
                                <p className="text-purple-200 mb-8 text-lg">Sign in to access your dashboard</p>
                                <button
                                    onClick={() => setInSignUpMode(false)}
                                    className="px-8 py-3.5 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
                                >
                                    Sign In
                                </button>
                            </div>
                        )}

                        {/* Sign Up Prompt / Sign Up Form */}
                        {!inSignUpMode ? (
                            <div className="p-10 bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-sm flex flex-col justify-center items-center text-center">
                                <UserPlus className="w-20 h-20 text-white mb-6" />
                                <h2 className="text-5xl font-bold text-white mb-4">Create</h2>
                                <h3 className="text-4xl font-bold text-white mb-6">An Account!</h3>
                                <p className="text-purple-200 mb-8 text-lg">Join us to access powerful financial AI tools</p>
                                <button
                                    onClick={() => setInSignUpMode(true)}
                                    className="px-8 py-3.5 border-2 border-white text-white rounded-xl font-semibold hover:bg-white hover:text-purple-600 transition-all duration-300"
                                >
                                    Sign Up
                                </button>
                            </div>
                        ) : (
                            <div className="p-10 space-y-5">
                                <div className="text-center mb-6">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                                        <UserPlus className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-white mb-2">Get Started</h2>
                                    <p className="text-purple-300">Create your account</p>
                                </div>

                                {displayMessage && (
                                    <div className="bg-purple-500/20 border border-purple-400/50 text-purple-200 px-4 py-3 rounded-xl text-center">
                                        {displayMessage}
                                    </div>
                                )}

                                <div className="space-y-3.5">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUserName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="email"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                        <input
                                            type="password"
                                            className="w-full bg-white/5 border border-white/20 rounded-xl px-12 py-3.5 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-6 justify-center py-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="User"
                                                checked={role === "User"}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-4 h-4 text-purple-500 focus:ring-purple-400"
                                            />
                                            <span className="text-white font-medium">User</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="Admin"
                                                checked={role === "Admin"}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-4 h-4 text-purple-500 focus:ring-purple-400"
                                            />
                                            <span className="text-white font-medium">Admin</span>
                                        </label>
                                    </div>

                                    <button
                                        onClick={handleSignUp}
                                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center gap-2 group"
                                    >
                                        <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-purple-300">© 2025 FinScope. Secure. Intelligent. Reliable.</p>
                </div>
            </div>
        </div>
    )
}