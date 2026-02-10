import React, { createContext, useContext, useState, useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import tutorialsData from '../data/tutorials.json';
import { useAuth } from './AuthContext';

const TutorialContext = createContext();

export function useTutorial() {
    return useContext(TutorialContext);
}

export function TutorialProvider({ children }) {
    const [activeTutorial, setActiveTutorial] = useState(null);
    const { user } = useAuth();
    const [driverObj, setDriverObj] = useState(null);

    useEffect(() => {
        const dObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            stagePadding: 4,
            overlayColor: '#000000',
            overlayOpacity: 0.6,
            doneBtnText: 'Finalizar',
            closeBtnText: 'Cerrar',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            onDestroy: () => setActiveTutorial(null),
        });
        setDriverObj(dObj);
    }, []);

    // Helper to find elements, including dynamic "first of status X" logic
    const resolveElement = (step) => {
        if (typeof step.element === 'string') {
            // Check for dynamic syntax: ">> row-status:pendiente"
            if (step.element.startsWith('>> row-status:')) {
                // syntax: ">> row-status:pendiente .my-class"
                const parts = step.element.replace('>> row-status:', '').trim().split(' ');
                const status = parts[0];
                const innerSelector = parts.slice(1).join(' ');

                // Find first row with this status
                const row = document.querySelector(`tr[data-status="${status}"]`);
                if (row) {
                    if (innerSelector) {
                        return row.querySelector(innerSelector) || row;
                    }
                    // Default behavior: try to find primary action
                    const actionBtn = row.querySelector('.btn-icon') || row.querySelector('.btn-action') || row.querySelector('a') || row;
                    return actionBtn;
                }
                return null;
            }
        }
        return document.querySelector(step.element);
    };

    const performAction = (element, action) => {
        if (!element || !action) return;

        setTimeout(() => {
            if (action.type === 'input') {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (action.type === 'click') {
                element.click();
            }
            if (action.type === 'focus') {
                element.focus();
            }
            // Navigate if action is 'navigate'
            if (action.type === 'navigate') {
                // logic handled by router usually, but if we need to force it:
                // window.location.href = action.value;
            }
        }, 300);
    };


    const startTutorial = (tutorialId) => {
        if (!driverObj) return;

        const tutorial = tutorialsData.find(t => t.id === tutorialId);
        if (!tutorial) {
            console.error(`Tutorial ${tutorialId} not found`);
            return;
        }

        // Check compatibility if user role is defined
        if (user && tutorial.role && user.role !== tutorial.role && user.role !== 'admin') {
            console.warn(`Tutorial ${tutorialId} is for ${tutorial.role}, user is ${user.role}`);
        }

        setActiveTutorial(tutorial);

        // Navigation Helper
        const startDriver = () => {
            const steps = tutorial.steps.map(step => ({
                element: step.element,
                popover: step.popover,
                onHighlightStarted: (element, stepOpt, options) => {
                    // Dynamic Resolution at runtime (in case list changed or page loaded)
                    // Driver.js doesn't natively support dynamic element re-evaluation easily in v1 without mapped steps
                    // BUT we can use the 'element' property if we pass the DOM element directly, 
                    // however driver v3/v1 expects selector string usually.

                    // Actually, let's try to resolve it *before* passing to driver if possible, 
                    // OR rely on driver's ability to take a DOM element.
                    // For now, we will rely on strict selectors. 
                    // IF we use our custom 'resolveElement', we need to run it before creating the step config.

                    if (!element) return; // Should not happen if driver found it

                    element.classList.add('tutorial-target-active');
                    element.style.setProperty('outline', '3px solid #ff00ea', 'important');
                    element.style.setProperty('outline-offset', '2px', 'important');
                    element.style.setProperty('z-index', '1000000002', 'important');
                    element.style.setProperty('position', 'relative', 'important');
                    element.style.setProperty('background-color', '#fff9c4', 'important');

                    if (step.action) {
                        performAction(element, step.action);
                    }
                },
                onDeselected: (element) => {
                    if (element) {
                        element.classList.remove('tutorial-target-active');
                        element.style.removeProperty('outline');
                        element.style.removeProperty('outline-offset');
                        element.style.removeProperty('z-index');
                        element.style.removeProperty('position');
                        element.style.removeProperty('background-color');
                    }
                }
            }));

            // Pre-resolve dynamic elements
            const resolvedSteps = steps.map(s => {
                const stepDef = tutorial.steps.find(ts => ts.popover.title === s.popover.title); // match by title/id
                if (stepDef && typeof stepDef.element === 'string' && stepDef.element.startsWith('>>')) {
                    const el = resolveElement(stepDef);
                    if (el) {
                        return { ...s, element: el };
                    } else {
                        console.warn('Dynamic element not found:', stepDef.element);
                        // Fallback? or keep mostly to let driver fail?
                        // Driver fails if element is null.
                        // Let's create a dummy element to avoid crash or just omit?
                        // Better to warn.
                        return s;
                    }
                }
                return s;
            });

            // If we have a Create Missing Component logic?
            // "si no existe el componente Parco crea el componente faltante"
            // This suggests IF the selector fails, we might need to inject a DOM element? 
            // That's risky for React. We should ensure the React components HAVE the elements.
            // I will assume the 'Missing Component' part of the prompt refers to the CODE (adding buttons to JSX), not runtime injection.

            driverObj.setSteps(resolvedSteps);
            driverObj.drive();
        };

        if (tutorial.startUrl && window.location.pathname !== tutorial.startUrl) {
            window.location.href = tutorial.startUrl;
            localStorage.setItem('pending_tutorial', tutorialId);
            return;
        }

        startDriver();
    };

    // Effect to resume tutorial after navigation
    useEffect(() => {
        const pendingTutorialId = localStorage.getItem('pending_tutorial');
        if (pendingTutorialId && driverObj) {
            localStorage.removeItem('pending_tutorial');
            startTutorial(pendingTutorialId);
        }
    }, [driverObj]);


    return (
        <TutorialContext.Provider value={{ startTutorial, activeTutorial, tutorials: tutorialsData }}>
            {children}
        </TutorialContext.Provider>
    );
}
