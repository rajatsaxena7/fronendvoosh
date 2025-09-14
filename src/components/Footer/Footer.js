import React from 'react';
import './Footer.scss';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__content">
                    <div className="footer__section">
                        <h4 className="footer__title">React SCSS Project</h4>
                        <p className="footer__description">
                            A modern React application with SCSS styling for beautiful, maintainable code.
                        </p>
                    </div>

                    <div className="footer__section">
                        <h4 className="footer__title">Quick Links</h4>
                        <ul className="footer__links">
                            <li><a href="#home" className="footer__link">Home</a></li>
                            <li><a href="#about" className="footer__link">About</a></li>
                            <li><a href="#contact" className="footer__link">Contact</a></li>
                        </ul>
                    </div>

                    <div className="footer__section">
                        <h4 className="footer__title">Technologies</h4>
                        <ul className="footer__links">
                            <li><a href="https://reactjs.org/" className="footer__link" target="_blank" rel="noopener noreferrer">React</a></li>
                            <li><a href="https://sass-lang.com/" className="footer__link" target="_blank" rel="noopener noreferrer">SCSS</a></li>
                            <li><a href="https://create-react-app.dev/" className="footer__link" target="_blank" rel="noopener noreferrer">Create React App</a></li>
                        </ul>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="footer__copyright">
                        © 2024 React SCSS Project. Built with ❤️ and modern web technologies.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
