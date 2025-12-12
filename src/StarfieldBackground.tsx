import { useRef, useEffect } from 'react';

export function StarfieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        setSize();
        window.addEventListener('resize', setSize);

        // Configuração das Partículas
        const particles: { x: number; y: number; z: number; color: string }[] = [];
        const particleCount = 400;
        const colors = ['#10B981', '#059669', '#34D399', '#6EE7B7']; // Tons de verde do tema

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width - width / 2,
                y: Math.random() * height - height / 2,
                z: Math.random() * 2000,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        let animationFrameId: number;

        const animate = () => {
            // Limpa com efeito de rastro
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height / 2;

            particles.forEach((p) => {
                // Move partícula em direção ao observador
                p.z -= 4; // Velocidade

                // Reinicia se passar do observador
                if (p.z <= 0) {
                    p.z = 2000;
                    p.x = Math.random() * width - width / 2;
                    p.y = Math.random() * height - height / 2;
                }

                // Projeta 3D para 2D
                const scale = 300 / (300 + p.z);
                const x2d = cx + p.x * scale * 2;
                const y2d = cy + p.y * scale * 2;

                // Desenha
                const size = (1 - p.z / 2000) * 3;
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setSize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                backgroundColor: 'black',
                pointerEvents: 'none',
                opacity: 0.8
            }}
        />
    );
}
