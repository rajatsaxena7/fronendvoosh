import React from 'react';
import './Header.scss';

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <nav className="nav">
                    <div className="nav__brand">
                        <h1>AI ChatBot</h1>
                    </div>
                    <ul className="nav__menu">
                        <li className="nav__item">
                            <a href="#chat" className="nav__link">Chat</a>
                        </li>
                        <li className="nav__item">
                            <a href="#features" className="nav__link">Features</a>
                        </li>
                        <li className="nav__item">
                            <a href="#help" className="nav__link">Help</a>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;
