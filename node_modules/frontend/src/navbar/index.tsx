"use client"; 

import React, { memo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../Hooks/useAuth";
import { supabase } from '../lib/supabase';
import './styles.css';

function NavHeader() {
  const {isLoggedIn, loading}=useAuth();
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const navigate = useNavigate();

  const handleLogOut=async ()=>{
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('user_id');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return null; // Don't render navbar while loading
  }

  return (
    <>
          <ul
            className="relative mx-auto flex w-fit rounded-full border-2 border-purple-400/50 bg-white/10 backdrop-blur-lg p-1 shadow-lg shadow-purple-500/30"
            onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
          >
            <Tab setPosition={setPosition}><Link className={`navBarComponentOptions ${location.pathname==='/'?"highlightedOptionColor":""}`} to={"/"}>Home</Link></Tab>
            {isLoggedIn && <Tab setPosition={setPosition}><Link className={`navBarComponentOptions ${location.pathname==='/dashboard'?"highlightedOptionColor":""}`} to={"/dashboard"}>DashBoard</Link></Tab>}
            {!isLoggedIn && <Tab setPosition={setPosition}><Link className={`navBarComponentOptions ${location.pathname==='/login'?"highlightedOptionColor":""}`} to={'/login'}>Connect</Link></Tab>}
            <Tab setPosition={setPosition}><Link className={`navBarComponentOptions ${location.pathname==='/aboutUs'?"highlightedOptionColor":""}`} to={'/aboutUs'}>About Us</Link></Tab>
            {isLoggedIn && <div onClick={()=>handleLogOut()}><Tab setPosition={setPosition} >Log Out</Tab></div>}
            <Cursor position={position} />
          </ul>
   </>
  );
}

const Tab = ({
  children,
  setPosition,
}: {
  children: React.ReactNode;
  setPosition: any;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;

        const { width } = ref.current.getBoundingClientRect();
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        });
      }}
      className="relative z-10 block cursor-pointer px-3 py-1.5 text-xs uppercase text-purple-200 hover:text-white transition-colors md:px-5 md:py-3 md:text-base"
    >
      {children}
    </li>
  );
};

const Cursor = ({ position }: { position: any }) => {
  return (
    <motion.li
      animate={position}
      className="absolute z-0 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 md:h-12"
    />
  );
};

export default memo(NavHeader);
