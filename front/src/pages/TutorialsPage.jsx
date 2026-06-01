
import React from 'react';
import { useTutorial } from '../context/TutorialContext';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, BookOpen, CheckCircle, Video, X } from 'lucide-react';

export default function TutorialsPage() {
    const { tutorials, startTutorial } = useTutorial();
    const { user } = useAuth();
    const [selectedVideo, setSelectedVideo] = React.useState(null);

    // Filter tutorials based on role if needed
    // For now, show all valid ones
    const availableTutorials = tutorials.filter(t =>
        !t.role || t.role === user?.role || user?.role === 'admin'
    );

    const groupedTutorials = availableTutorials.reduce((acc, tutorial) => {
        const module = tutorial.module || 'General';
        if (!acc[module]) acc[module] = [];
        acc[module].push(tutorial);
        return acc;
    }, {});

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <BookOpen className="text-blue-600" />
                    Centro de Aprendizaje
                </h1>
                <p className="text-gray-600 mt-2">
                    Guías interactivas paso a paso para dominar la plataforma.
                </p>
            </header>

            {Object.keys(groupedTutorials).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-500">No hay tutoriales disponibles para tu rol actual.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedTutorials).map(([moduleName, moduleTutorials]) => (
                        <div key={moduleName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-800">{moduleName}</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                    {moduleTutorials.length} Guías
                                </span>
                            </div>
                            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {moduleTutorials.map((tutorial) => (
                                    <div
                                        key={tutorial.id}
                                        className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white hover:border-blue-300 flex flex-col"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div 
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-600 hover:text-white transition-colors"
                                                onClick={() => startTutorial(tutorial.id)}
                                                title="Iniciar guía interactiva"
                                            >
                                                <PlayCircle size={24} />
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {tutorial.role && (
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded">
                                                        {tutorial.role}
                                                    </span>
                                                )}
                                                {tutorial.videoUrl && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVideo(tutorial.videoUrl);
                                                        }}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
                                                    >
                                                        <Video size={12} /> CÁPSULA
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div onClick={() => startTutorial(tutorial.id)} className="cursor-pointer flex-1">
                                            <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {tutorial.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                {tutorial.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-400 gap-1 pt-4 border-t border-gray-100">
                                            <CheckCircle size={12} />
                                            <span>{tutorial.steps.length} pasos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Video Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="absolute top-4 right-4 z-10">
                            <button 
                                onClick={() => setSelectedVideo(null)}
                                className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <video 
                                src={selectedVideo} 
                                controls 
                                autoPlay
                                className="w-full h-full"
                            >
                                Tu navegador no soporta el tag de video.
                            </video>
                        </div>
                        
                        <div className="p-6 bg-gray-900 border-t border-white/5">
                            <h3 className="text-xl font-bold text-white">Visualización de Tutorial</h3>
                            <p className="text-gray-400 text-sm mt-1">Cápsula de video generada automáticamente para este flujo.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
