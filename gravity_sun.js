// gravity_ball.js
// Gravity Ball faite avec de vrais pixels + Ctrl clic gauche pour régler la gravité

(function () {
    "use strict";

    let ctrlDown = false;

    document.addEventListener("keydown", function (e) {
        if (e.key === "Control") ctrlDown = true;
    });

    document.addEventListener("keyup", function (e) {
        if (e.key === "Control") ctrlDown = false;
    });

    document.addEventListener("mousedown", function (e) {
        ctrlDown = e.ctrlKey;
    }, true);

    document.addEventListener("mouseup", function (e) {
        ctrlDown = e.ctrlKey;
    }, true);

    window.addEventListener("blur", function () {
        ctrlDown = false;
    });

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function sign(n) {
        if (n > 0) return 1;
        if (n < 0) return -1;
        return 0;
    }

    // Vraie boule pixel-art 7x7
    const BALL_ART = [
        "..111..",
        ".12221.",
        "1233321",
        "1234321",
        "1233321",
        ".12221.",
        "..111.."
    ];

    const BALL_COLORS = {
        "1": "#1b1b28",
        "2": "#2c2d44",
        "3": "#3d3f63",
        "4": "#56598a"
    };

    function createGravityBall(corePixel) {
        const size = BALL_ART.length;
        const offset = Math.floor(size / 2);

        for (let yy = 0; yy < size; yy++) {
            for (let xx = 0; xx < BALL_ART[yy].length; xx++) {
                const char = BALL_ART[yy][xx];

                if (char === ".") continue;

                const x = corePixel.x + xx - offset;
                const y = corePixel.y + yy - offset;

                if (outOfBounds(x, y)) continue;

                // Centre de la boule = vrai pixel qui contrôle la gravité
                if (x === corePixel.x && y === corePixel.y) {
                    corePixel.color = BALL_COLORS[char];
                    continue;
                }

                if (isEmpty(x, y, false)) {
                    createPixel("gravity_ball_pixel", x, y);

                    const p = pixelMap[x][y];

                    if (p) {
                        p.color = BALL_COLORS[char];
                        p.gravityCoreX = corePixel.x;
                        p.gravityCoreY = corePixel.y;
                    }
                }
            }
        }
    }

    function findGravityCore(pixel) {
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
                const x = pixel.x + dx;
                const y = pixel.y + dy;

                if (outOfBounds(x, y)) continue;

                const p = pixelMap[x][y];

                if (p && p.element === "gravity_ball") {
                    return p;
                }
            }
        }

        return null;
    }

    function openGravityPopup(corePixel) {
        const current = corePixel.gravityPower || 30;

        promptInput(
            "Puissance de la Gravity Ball :\n\n10 = faible\n30 = normal\n80 = fort\n150 = énorme\n0 = off\n-30 = répulsion",
            function (value) {
                let number = parseFloat(value);

                if (isNaN(number)) {
                    logMessage("Nombre invalide.");
                    return;
                }

                number = clamp(number, -200, 200);

                corePixel.gravityPower = number;

                if (number > 0) {
                    corePixel.color = "#56598a";
                    logMessage("Gravity Ball attraction : " + number);
                } else if (number < 0) {
                    corePixel.color = "#4cc9f0";
                    logMessage("Gravity Ball répulsion : " + number);
                } else {
                    corePixel.color = "#555555";
                    logMessage("Gravity Ball désactivée.");
                }
            },
            "Gravity Ball",
            String(current)
        );
    }

    function applyGravity(corePixel) {
        const power = corePixel.gravityPower || 30;

        if (power === 0) return;

        const radius = clamp(Math.abs(power), 1, 200);
        const radiusSq = radius * radius;
        const repulse = power < 0;

        const minX = Math.max(0, corePixel.x - radius);
        const maxX = Math.min(width - 1, corePixel.x + radius);
        const minY = Math.max(0, corePixel.y - radius);
        const maxY = Math.min(height - 1, corePixel.y + radius);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const target = pixelMap[x][y];

                if (!target) continue;
                if (target === corePixel) continue;
                if (target.element === "gravity_ball") continue;
                if (target.element === "gravity_ball_pixel") continue;

                const dx = corePixel.x - target.x;
                const dy = corePixel.y - target.y;

                const distSq = dx * dx + dy * dy;

                if (distSq < 1 || distSq > radiusSq) continue;

                const dist = Math.sqrt(distSq);
                const chance = clamp(1 - dist / radius, 0.02, 1);

                if (Math.random() > chance) continue;

                let moveX = sign(dx);
                let moveY = sign(dy);

                if (repulse) {
                    moveX *= -1;
                    moveY *= -1;
                }

                const moves = [];

                if (moveX !== 0 && moveY !== 0) {
                    moves.push([target.x + moveX, target.y + moveY]);
                }

                if (Math.abs(dx) >= Math.abs(dy)) {
                    if (moveX !== 0) moves.push([target.x + moveX, target.y]);
                    if (moveY !== 0) moves.push([target.x, target.y + moveY]);
                } else {
                    if (moveY !== 0) moves.push([target.x, target.y + moveY]);
                    if (moveX !== 0) moves.push([target.x + moveX, target.y]);
                }

                for (const move of moves) {
                    const nx = move[0];
                    const ny = move[1];

                    if (outOfBounds(nx, ny)) continue;

                    if (isEmpty(nx, ny, false)) {
                        tryMove(target, nx, ny, undefined, true);
                        break;
                    }
                }
            }
        }
    }

    elements.gravity_ball = {
        name: "Gravity Ball",
        color: "#56598a",
        behavior: behaviors.WALL,
        category: "Gravity Ball",
        state: "solid",
        density: 999999,
        hardness: 1,
        movable: false,

        properties: {
            gravityPower: 30
        },

        onPlace: function (pixel) {
            pixel.gravityPower = 30;
            createGravityBall(pixel);
        },

        tick: function (pixel) {
            applyGravity(pixel);
        },

        onClicked: function (pixel) {
            if (ctrlDown) {
                openGravityPopup(pixel);
            }
        },

        desc: "Vraie boule de gravité faite avec plusieurs pixels. Ctrl + clic gauche pour régler la puissance."
    };

    elements.gravity_ball_pixel = {
        name: "Gravity Ball Pixel",
        color: "#2c2d44",
        behavior: behaviors.WALL,
        category: "Gravity Ball",
        hidden: true,
        state: "solid",
        density: 999999,
        hardness: 1,
        movable: false,

        onClicked: function (pixel) {
            if (!ctrlDown) return;

            const core = findGravityCore(pixel);

            if (core) {
                openGravityPopup(core);
            }
        }
    };

})();
