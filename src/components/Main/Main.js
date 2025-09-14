import React from 'react';
import './Main.scss';

const Main = () => {
    return (
        <main className="main">
            <div className="container">
                <section className="hero">
                    <h2 className="hero__title">Welcome to React with SCSS</h2>
                    <p className="hero__subtitle">
                        A modern React application with SCSS styling for beautiful, maintainable code.
                    </p>
                    <button className="btn btn--primary">Get Started</button>
                </section>

                <section className="features">
                    <h3 className="features__title">Features</h3>
                    <div className="features__grid">
                        <div className="feature-card">
                            <div className="feature-card__icon">⚛️</div>
                            <h4 className="feature-card__title">React 18</h4>
                            <p className="feature-card__description">
                                Latest React features with hooks and modern development patterns.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-card__icon">🎨</div>
                            <h4 className="feature-card__title">SCSS Styling</h4>
                            <p className="feature-card__description">
                                Powerful CSS preprocessor with variables, mixins, and nesting.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-card__icon">📱</div>
                            <h4 className="feature-card__title">Responsive Design</h4>
                            <p className="feature-card__description">
                                Mobile-first approach with flexible layouts and breakpoints.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Main;
