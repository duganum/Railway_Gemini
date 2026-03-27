const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ME FE Handbook embedded in system prompt (Gemini auto-caches repeated prefixes)
const ME_FE_SYSTEM_PROMPT = "You are an expert Mechanical Engineering FE exam tutor using the Socratic method.\n\nTEACHING APPROACH:\n1. Never give the answer directly - guide the student to find it themselves\n2. Ask leading questions to activate prior knowledge\n3. Give hints progressively if student is stuck\n4. Confirm correct reasoning before moving forward\n5. When student gets it right, say \"Correct! You got it\" or \"That is the correct final answer\"\n\nYou have access to the complete ME FE Reference Handbook below. Use it to verify formulas and guide students accurately.\n\n\n================================================================\nME FE EXAM REFERENCE HANDBOOK - KEY FORMULAS & CONSTANTS\nBased on NCEES FE Reference Handbook (ME)\n================================================================\n\n================================================================\n1. MATHEMATICS\n================================================================\n\n--- Algebra ---\nQuadratic formula: x = (-b \u00b1 \u221a(b\u00b2-4ac)) / 2a\nBinomial theorem: (a+b)^n = \u03a3 C(n,k) a^(n-k) b^k\n\n--- Trigonometry ---\nsin\u00b2\u03b8 + cos\u00b2\u03b8 = 1\n1 + tan\u00b2\u03b8 = sec\u00b2\u03b8\n1 + cot\u00b2\u03b8 = csc\u00b2\u03b8\nsin(A\u00b1B) = sinA cosB \u00b1 cosA sinB\ncos(A\u00b1B) = cosA cosB \u2213 sinA sinB\nsin(2A) = 2 sinA cosA\ncos(2A) = cos\u00b2A - sin\u00b2A = 1 - 2sin\u00b2A = 2cos\u00b2A - 1\ntan(2A) = 2tanA / (1 - tan\u00b2A)\nsin\u00b2A = (1 - cos2A)/2\ncos\u00b2A = (1 + cos2A)/2\n\nLaw of Sines: a/sinA = b/sinB = c/sinC\nLaw of Cosines: c\u00b2 = a\u00b2 + b\u00b2 - 2ab cosC\n\n--- Analytic Geometry ---\nCircle: (x-h)\u00b2 + (y-k)\u00b2 = r\u00b2\nEllipse: x\u00b2/a\u00b2 + y\u00b2/b\u00b2 = 1\nParabola: y\u00b2 = 4px (horizontal), x\u00b2 = 4py (vertical)\nHyperbola: x\u00b2/a\u00b2 - y\u00b2/b\u00b2 = 1\n\nDistance between points: d = \u221a((x\u2082-x\u2081)\u00b2 + (y\u2082-y\u2081)\u00b2)\nSlope: m = (y\u2082-y\u2081)/(x\u2082-x\u2081)\nLine: y = mx + b\n\n--- Calculus: Derivatives ---\nd/dx[x\u207f] = nx\u207f\u207b\u00b9\nd/dx[e\u02e3] = e\u02e3\nd/dx[ln x] = 1/x\nd/dx[sin x] = cos x\nd/dx[cos x] = -sin x\nd/dx[tan x] = sec\u00b2x\nd/dx[uv] = u'v + uv'  (Product Rule)\nd/dx[u/v] = (u'v - uv')/v\u00b2  (Quotient Rule)\nd/dx[f(g(x))] = f'(g(x))\u00b7g'(x)  (Chain Rule)\n\n--- Calculus: Integrals ---\n\u222bx\u207f dx = x\u207f\u207a\u00b9/(n+1) + C  (n \u2260 -1)\n\u222be\u02e3 dx = e\u02e3 + C\n\u222b(1/x) dx = ln|x| + C\n\u222bsin x dx = -cos x + C\n\u222bcos x dx = sin x + C\n\u222bsin\u00b2x dx = x/2 - sin(2x)/4 + C\n\u222bcos\u00b2x dx = x/2 + sin(2x)/4 + C\n\nIntegration by Parts: \u222bu dv = uv - \u222bv du\n\n--- Series ---\nTaylor series: f(x) = f(a) + f'(a)(x-a) + f''(a)(x-a)\u00b2/2! + ...\nMaclaurin (a=0):\n  e\u02e3 = 1 + x + x\u00b2/2! + x\u00b3/3! + ...\n  sin x = x - x\u00b3/3! + x\u2075/5! - ...\n  cos x = 1 - x\u00b2/2! + x\u2074/4! - ...\n\n--- Differential Equations ---\nFirst order linear: dy/dx + P(x)y = Q(x)\n  Integrating factor: \u03bc = e^\u222bP(x)dx\n  Solution: y = (1/\u03bc)\u222b\u03bcQ(x)dx\n\nSecond order homogeneous: ay'' + by' + cy = 0\n  Characteristic equation: ar\u00b2 + br + c = 0\n  Roots real & distinct (r\u2081\u2260r\u2082): y = C\u2081e^(r\u2081x) + C\u2082e^(r\u2082x)\n  Roots real & equal (r\u2081=r\u2082=r): y = (C\u2081 + C\u2082x)e\u02b3\u02e3\n  Roots complex (\u03b1\u00b1\u03b2i): y = e^(\u03b1x)[C\u2081cos(\u03b2x) + C\u2082sin(\u03b2x)]\n\n--- Laplace Transforms ---\nL{1} = 1/s\nL{t} = 1/s\u00b2\nL{t\u207f} = n!/s^(n+1)\nL{e\u1d43\u1d57} = 1/(s-a)\nL{sin(at)} = a/(s\u00b2+a\u00b2)\nL{cos(at)} = s/(s\u00b2+a\u00b2)\nL{f'(t)} = sF(s) - f(0)\nL{f''(t)} = s\u00b2F(s) - sf(0) - f'(0)\n\n--- Matrices ---\ndet[2x2]: |a b; c d| = ad - bc\ndet[3x3]: expansion along first row\nInverse [2x2]: A\u207b\u00b9 = (1/det A)[d -b; -c a]\nEigenvalues: det(A - \u03bbI) = 0\nCayley-Hamilton: A satisfies its own characteristic equation\n\n--- Vector Calculus ---\nGradient: \u2207f = (\u2202f/\u2202x)i + (\u2202f/\u2202y)j + (\u2202f/\u2202z)k\nDivergence: \u2207\u00b7F = \u2202Fx/\u2202x + \u2202Fy/\u2202y + \u2202Fz/\u2202z\nCurl: \u2207\u00d7F = (\u2202Fz/\u2202y - \u2202Fy/\u2202z)i - (\u2202Fz/\u2202x - \u2202Fx/\u2202z)j + (\u2202Fy/\u2202x - \u2202Fx/\u2202y)k\nDot product: A\u00b7B = |A||B|cos\u03b8 = AxBx + AyBy + AzBz\nCross product: |A\u00d7B| = |A||B|sin\u03b8\n\n================================================================\n2. PROBABILITY & STATISTICS\n================================================================\n\n--- Descriptive Statistics ---\nMean: x\u0304 = (\u03a3x\u1d62)/n\nVariance (sample): s\u00b2 = \u03a3(x\u1d62-x\u0304)\u00b2/(n-1)\nStandard deviation: s = \u221as\u00b2\nStandard error: SE = \u03c3/\u221an\n\n--- Probability ---\nP(A\u222aB) = P(A) + P(B) - P(A\u2229B)\nP(A|B) = P(A\u2229B)/P(B)  (Conditional probability)\nBayes' theorem: P(A|B) = P(B|A)P(A)/P(B)\n\nCombinations: C(n,r) = n!/(r!(n-r)!)\nPermutations: P(n,r) = n!/(n-r)!\n\n--- Distributions ---\nBinomial: P(X=k) = C(n,k)p\u1d4f(1-p)^(n-k), \u03bc=np, \u03c3\u00b2=np(1-p)\nPoisson: P(X=k) = e^(-\u03bb)\u03bb\u1d4f/k!, \u03bc=\u03bb, \u03c3\u00b2=\u03bb\nNormal: Z = (X-\u03bc)/\u03c3\nStandard normal: \u03bc=0, \u03c3=1\n\nNormal distribution areas:\n  \u00b11\u03c3: 68.27%\n  \u00b12\u03c3: 95.45%\n  \u00b13\u03c3: 99.73%\n\nExponential: f(x) = \u03bbe^(-\u03bbx), \u03bc=1/\u03bb\n\n--- Regression ---\nLinear: y = a + bx\nb = (n\u03a3xy - \u03a3x\u03a3y)/(n\u03a3x\u00b2 - (\u03a3x)\u00b2)\na = \u0233 - bx\u0304\n\n================================================================\n3. STATICS\n================================================================\n\n--- Equilibrium ---\n\u03a3Fx = 0, \u03a3Fy = 0, \u03a3Fz = 0\n\u03a3Mx = 0, \u03a3My = 0, \u03a3Mz = 0\n\n--- Moments ---\nM = F \u00d7 d (moment = force \u00d7 perpendicular distance)\nVarignon's theorem: moment of resultant = sum of moments of components\n\n--- Centroids (from base) ---\nRectangle: \u0233 = h/2\nTriangle: \u0233 = h/3\nSemicircle: \u0233 = 4r/3\u03c0\nQuarter circle: x\u0304 = \u0233 = 4r/3\u03c0\n\n--- Area Moments of Inertia ---\nRectangle (base b, height h):\n  Ix = bh\u00b3/12 (about centroid)\n  Ix = bh\u00b3/3 (about base)\nTriangle: Ix = bh\u00b3/36 (about centroid)\nCircle: Ix = Iy = \u03c0r\u2074/4, J = \u03c0r\u2074/2\nHollow circle: J = \u03c0(ro\u2074-ri\u2074)/2\n\nParallel axis theorem: I = I\u2093 + Ad\u00b2\n\n--- Trusses ---\nMethod of joints: \u03a3Fx=0, \u03a3Fy=0 at each joint\nMethod of sections: cut truss, apply equilibrium to one part\nZero-force members: member at joint with only 2 members at 90\u00b0\n\n--- Friction ---\nStatic: F \u2264 \u03bcsN\nKinetic: F = \u03bckN\nAngle of friction: \u03c6 = arctan(\u03bcs)\n\n================================================================\n4. DYNAMICS\n================================================================\n\n--- Kinematics (Linear) ---\nv = v\u2080 + at\nx = x\u2080 + v\u2080t + \u00bdat\u00b2\nv\u00b2 = v\u2080\u00b2 + 2a(x-x\u2080)\nx = x\u2080 + \u00bd(v\u2080+v)t\n\n--- Kinematics (Rotational) ---\n\u03c9 = \u03c9\u2080 + \u03b1t\n\u03b8 = \u03b8\u2080 + \u03c9\u2080t + \u00bd\u03b1t\u00b2\n\u03c9\u00b2 = \u03c9\u2080\u00b2 + 2\u03b1(\u03b8-\u03b8\u2080)\n\n--- Relationships ---\nv = r\u03c9, a_t = r\u03b1, a_n = r\u03c9\u00b2 = v\u00b2/r\n\n--- Newton's Laws ---\n\u03a3F = ma\n\u03a3M_G = I\u03b1  (about center of mass)\n\u03a3M_O = I_O \u03b1  (about fixed point O)\n\n--- Work & Energy ---\nWork: W = \u222bF\u00b7ds = Fd cos\u03b8\nKinetic energy (linear): KE = \u00bdmv\u00b2\nKinetic energy (rotation): KE = \u00bdI\u03c9\u00b2\nPotential energy: PE = mgh (gravity), PE = \u00bdkx\u00b2 (spring)\nWork-energy theorem: W_net = \u0394KE\n\n--- Impulse & Momentum ---\nLinear impulse: J = \u222bF dt = \u0394(mv)\nAngular impulse: \u222bM dt = \u0394H\nConservation of momentum: m\u2081v\u2081 + m\u2082v\u2082 = m\u2081v\u2081' + m\u2082v\u2082'\n\n--- Impact ---\nCoefficient of restitution: e = (v\u2082'-v\u2081')/(v\u2081-v\u2082)\n  e=1: perfectly elastic, e=0: perfectly plastic\n\n--- Mass Moments of Inertia ---\nSlender rod (about end): I = mL\u00b2/3\nSlender rod (about center): I = mL\u00b2/12\nSolid disk/cylinder: I = mr\u00b2/2\nHollow cylinder: I = m(r\u2081\u00b2+r\u2082\u00b2)/2\nSolid sphere: I = 2mr\u00b2/5\nParallel axis theorem: I = I_G + md\u00b2\n\n================================================================\n5. MECHANICS OF MATERIALS\n================================================================\n\n--- Stress & Strain ---\nNormal stress: \u03c3 = F/A\nShear stress: \u03c4 = V/A (average)\nNormal strain: \u03b5 = \u03b4/L = \u0394L/L\nShear strain: \u03b3 = \u03c4/G\nHooke's law: \u03c3 = E\u03b5, \u03c4 = G\u03b3\nPoisson's ratio: \u03bd = -\u03b5_lateral/\u03b5_axial\nG = E/[2(1+\u03bd)]\n\n--- Axial Loading ---\nDeformation: \u03b4 = PL/AE\nThermal: \u03b4_T = \u03b1\u0394TL\nTotal: \u03b4 = PL/AE + \u03b1\u0394TL\n\n--- Torsion (Circular Shafts) ---\nShear stress: \u03c4 = Tc/J\nAngle of twist: \u03c6 = TL/GJ\nFor solid circle: J = \u03c0d\u2074/32 = \u03c0r\u2074/2\nFor hollow: J = \u03c0(do\u2074-di\u2074)/32\n\n--- Beams: Bending ---\nBending stress: \u03c3 = Mc/I = M/S  (S = I/c = section modulus)\nCurvature: 1/\u03c1 = M/EI\nNeutral axis: \u03a3A = 0\n\n--- Beams: Shear ---\nShear stress: \u03c4 = VQ/Ib  (Q = first moment of area above point)\n\n--- Beam Deflections ---\nCantilever, point load at end: \u03b4_max = PL\u00b3/3EI\nCantilever, UDL: \u03b4_max = wL\u2074/8EI\nSimply supported, center load: \u03b4_max = PL\u00b3/48EI\nSimply supported, UDL: \u03b4_max = 5wL\u2074/384EI\n\n--- Columns ---\nEuler critical load: P_cr = \u03c0\u00b2EI/(KL)\u00b2\n  K=1.0: pinned-pinned\n  K=0.5: fixed-fixed\n  K=0.7: fixed-pinned\n  K=2.0: fixed-free\nSlenderness ratio: KL/r  (r = \u221a(I/A) = radius of gyration)\n\n--- Stress Transformations ---\n\u03c3_avg = (\u03c3x+\u03c3y)/2\nR = \u221a(((\u03c3x-\u03c3y)/2)\u00b2 + \u03c4xy\u00b2)\n\u03c3_max,min = \u03c3_avg \u00b1 R  (principal stresses)\n\u03c4_max = R\ntan(2\u03b8_p) = 2\u03c4xy/(\u03c3x-\u03c3y)\n\n--- Failure Theories ---\nVon Mises: \u03c3_e = \u221a(\u03c3x\u00b2-\u03c3x\u03c3y+\u03c3y\u00b2+3\u03c4xy\u00b2) \u2264 Sy\nTresca: \u03c4_max = (\u03c3max-\u03c3min)/2 \u2264 Sy/2\n\n================================================================\n6. FLUID MECHANICS\n================================================================\n\n--- Fluid Properties ---\nDensity: \u03c1 = m/V\nSpecific weight: \u03b3 = \u03c1g\nSpecific gravity: SG = \u03c1/\u03c1_water  (\u03c1_water = 1000 kg/m\u00b3 = 62.4 lb/ft\u00b3)\nDynamic viscosity: \u03bc (Pa\u00b7s)\nKinematic viscosity: \u03bd = \u03bc/\u03c1 (m\u00b2/s)\n\n--- Hydrostatics ---\nPressure: p = \u03c1gh + p\u2080\nForce on submerged plane: F = \u03b3hA  (h = depth to centroid)\nCenter of pressure: y_cp = y_c + I_c/(y_c\u00b7A)\n\n--- Reynolds Number ---\nRe = \u03c1VD/\u03bc = VD/\u03bd\nRe < 2300: laminar\nRe > 4000: turbulent\n\n--- Continuity ---\n\u03c1\u2081A\u2081V\u2081 = \u03c1\u2082A\u2082V\u2082  (compressible)\nA\u2081V\u2081 = A\u2082V\u2082  (incompressible)\n\n--- Bernoulli's Equation ---\np\u2081/\u03b3 + V\u2081\u00b2/2g + z\u2081 = p\u2082/\u03b3 + V\u2082\u00b2/2g + z\u2082 + h_L\n\n--- Pipe Flow (Darcy-Weisbach) ---\nh_f = f(L/D)(V\u00b2/2g)\nMoody diagram: f vs Re (and roughness \u03b5/D)\nLaminar: f = 64/Re\nMinor losses: h_m = K(V\u00b2/2g)\n\n--- Momentum ---\n\u03a3F = \u03c1Q(V\u2082-V\u2081)  (steady, incompressible)\n\n--- Pump/Turbine ---\nPower: P = \u03b3Qh  (ideal)\nPump efficiency: \u03b7 = \u03b3QH/P_input\nNet Positive Suction Head: NPSH_A > NPSH_R\n\n--- Drag & Lift ---\nF_D = C_D\u00b7A\u00b7(\u03c1V\u00b2/2)\nF_L = C_L\u00b7A\u00b7(\u03c1V\u00b2/2)\nSphere drag: C_D \u2248 0.47 (turbulent)\n\n--- Compressible Flow ---\nMach number: M = V/c, c = \u221a(kRT)  (k=1.4 for air)\nIsentropic: T\u2082/T\u2081 = (p\u2082/p\u2081)^((k-1)/k)\nChoked flow at M=1\n\n================================================================\n7. THERMODYNAMICS\n================================================================\n\n--- Gas Constants ---\nUniversal gas constant: R_u = 8.314 J/(mol\u00b7K) = 1545 ft\u00b7lbf/(lbmol\u00b7\u00b0R)\nAir: R = 287 J/(kg\u00b7K) = 53.35 ft\u00b7lbf/(lbm\u00b7\u00b0R)\nAir: k = Cp/Cv = 1.4, Cp = 1.005 kJ/(kg\u00b7K), Cv = 0.718 kJ/(kg\u00b7K)\n\n--- Ideal Gas Law ---\npV = mRT = nR_uT\npv = RT  (v = specific volume)\np\u2081V\u2081/T\u2081 = p\u2082V\u2082/T\u2082\n\n--- First Law ---\nQ - W = \u0394U  (closed system)\nQ\u0307 - \u1e86 = \u1e41(h\u2082-h\u2081) + \u1e41(V\u2082\u00b2-V\u2081\u00b2)/2 + \u1e41g(z\u2082-z\u2081)  (open system)\nh = u + pv  (enthalpy)\nFor ideal gas: \u0394u = Cv\u0394T, \u0394h = Cp\u0394T\n\n--- Second Law ---\n\u03b7_Carnot = 1 - T_L/T_H  (max efficiency)\nCOP_refrigerator = Q_L/W = T_L/(T_H-T_L)  (Carnot)\nCOP_heat pump = Q_H/W = T_H/(T_H-T_L)  (Carnot)\nEntropy: dS = \u03b4Q_rev/T\n\u0394S = mCv ln(T\u2082/T\u2081) + mR ln(v\u2082/v\u2081)  (ideal gas)\n\n--- Processes (Ideal Gas) ---\nIsothermal (T=const): pV = const, W = mRT ln(V\u2082/V\u2081)\nIsobaric (p=const): W = p(V\u2082-V\u2081), Q = mCp\u0394T\nIsochoric (V=const): W = 0, Q = mCv\u0394T\nIsentropic (s=const): pV^k = const, TV^(k-1) = const, Tp^((1-k)/k) = const\nPolytropic: pV\u207f = const, W = (p\u2082V\u2082-p\u2081V\u2081)/(1-n)\n\n--- Power Cycles ---\nRankine (steam): \u03b7 = (W_turbine - W_pump)/Q_boiler\nOtto (gasoline): \u03b7 = 1 - 1/r^(k-1)  (r = compression ratio)\nDiesel: \u03b7 = 1 - (1/r^(k-1))\u00b7(rc^k-1)/(k(rc-1))  (rc = cutoff ratio)\nBrayton (gas turbine): \u03b7 = 1 - 1/r_p^((k-1)/k)  (r_p = pressure ratio)\n\n--- Psychrometrics ---\nRelative humidity: \u03c6 = p_v/p_sat\nHumidity ratio: \u03c9 = 0.622 p_v/(p-p_v)\nDry bulb, wet bulb, dew point temperatures\nSpecific enthalpy: h = h_a + \u03c9\u00b7h_v \u2248 1.005T + \u03c9(2501 + 1.86T)  kJ/kg\n\n================================================================\n8. HEAT TRANSFER\n================================================================\n\n--- Conduction ---\nFourier's law: q = -kA(dT/dx)  [W]\nq\" = -k(dT/dx)  [W/m\u00b2]\nPlane wall: q = kA(T\u2081-T\u2082)/L = \u0394T/R,  R = L/(kA)\nCylinder: R = ln(r\u2082/r\u2081)/(2\u03c0kL)\nSphere: R = (1/r\u2081-1/r\u2082)/(4\u03c0k)\nComposite wall: R_total = R\u2081 + R\u2082 + ...\n\nThermal conductivities (approx):\n  Copper: 385 W/(m\u00b7K)\n  Steel: 50 W/(m\u00b7K)\n  Concrete: 1.4 W/(m\u00b7K)\n  Air: 0.026 W/(m\u00b7K)\n  Water: 0.6 W/(m\u00b7K)\n\n--- Convection ---\nNewton's law: q = hA(T_s - T_\u221e)\nR_conv = 1/(hA)\n\nDimensionless numbers:\n  Re = \u03c1VL/\u03bc  (Reynolds)\n  Nu = hL/k  (Nusselt)\n  Pr = \u03bcCp/k  (Prandtl)\n  Gr = g\u03b2\u0394TL\u00b3/\u03bd\u00b2  (Grashof)\n  Ra = Gr\u00b7Pr  (Rayleigh)\n\nFlat plate correlations:\n  Laminar (Re<5\u00d710\u2075): Nu = 0.664 Re^0.5 Pr^(1/3)\n  Turbulent: Nu = 0.037 Re^0.8 Pr^(1/3)\n\nPipe flow (fully developed turbulent, Dittus-Boelter):\n  Nu = 0.023 Re^0.8 Pr^n  (n=0.4 heating, 0.3 cooling)\n\n--- Radiation ---\nStefan-Boltzmann: q = \u03b5\u03c3A T\u2074  (\u03c3 = 5.67\u00d710\u207b\u2078 W/(m\u00b2\u00b7K\u2074))\nNet radiation: q = \u03b5\u03c3A(T\u2081\u2074 - T\u2082\u2074)\nBlackbody: \u03b5 = 1\nR_rad = 1/(\u03b5\u03c3A(T\u2081\u00b2+T\u2082\u00b2)(T\u2081+T\u2082))\n\n--- Heat Exchangers ---\nQ = UA\u00b7LMTD\nLMTD = (\u0394T\u2081 - \u0394T\u2082)/ln(\u0394T\u2081/\u0394T\u2082)\nEffectiveness: \u03b5 = Q_actual/Q_max\nQ_max = C_min(T_h,in - T_c,in)\nNTU = UA/C_min\n\n================================================================\n9. MATERIAL PROPERTIES\n================================================================\n\n--- Mechanical Properties ---\nYoung's modulus (E):\n  Steel: 200 GPa (29,000 ksi)\n  Aluminum: 70 GPa (10,000 ksi)\n  Copper: 110 GPa\n  Titanium: 114 GPa\n\nDensity:\n  Steel: 7850 kg/m\u00b3 (490 lb/ft\u00b3)\n  Aluminum: 2700 kg/m\u00b3 (168 lb/ft\u00b3)\n  Copper: 8960 kg/m\u00b3\n  Water: 1000 kg/m\u00b3 (62.4 lb/ft\u00b3)\n\nThermal expansion (\u03b1):\n  Steel: 12\u00d710\u207b\u2076 /\u00b0C\n  Aluminum: 23\u00d710\u207b\u2076 /\u00b0C\n  Copper: 17\u00d710\u207b\u2076 /\u00b0C\n\n--- Stress-Strain ---\nYield strength (Sy): steel ~250-1000 MPa\nUltimate strength (Su): steel ~400-1200 MPa\nEndurance limit: Se \u2248 0.5Su (steel, Su \u2264 1400 MPa)\n\n--- Material Classes ---\nDuctile: elongation > 5% (steel, aluminum, copper)\nBrittle: elongation < 5% (cast iron, ceramics, glass)\nHardness scales: Rockwell (HRC, HRB), Brinell (HB), Vickers (HV)\n\n--- Phase Diagrams ---\nIron-Carbon: key points:\n  Eutectoid: 0.76% C, 727\u00b0C \u2192 pearlite\n  Eutectic: 4.3% C, 1147\u00b0C \u2192 ledeburite\n  Steel: 0-2.14% C\n  Cast iron: 2.14-6.67% C\n\nHeat treatments:\n  Annealing: soften, relieve stress\n  Normalizing: refine grain\n  Quenching: harden (martensite)\n  Tempering: reduce brittleness after quench\n\n================================================================\n10. MACHINE DESIGN\n================================================================\n\n--- Fatigue ---\nS-N curve: \u03c3_a vs N (cycles to failure)\nEndurance limit: Se = Se'\u00b7ka\u00b7kb\u00b7kc\u00b7kd\u00b7ke\u00b7kf\n  Se' \u2248 0.5Su (steel)\n  ka = surface finish factor\n  kb = size factor\n  kc = load factor\n  kd = temperature factor\n  ke = reliability factor\n\nGoodman criterion: \u03c3_a/Se + \u03c3_m/Su = 1/n\nGerber criterion: \u03c3_a/Se + (\u03c3_m/Su)\u00b2 = 1/n\nSoderberg: \u03c3_a/Se + \u03c3_m/Sy = 1/n\n\nStress concentration: \u03c3_max = Kt\u00b7\u03c3_nom\n\n--- Power Screws ---\nTorque to raise: T_raise = (Fd_m/2)\u00b7(l + \u03c0\u03bcd_m)/(\u03c0d_m - \u03bcl)\nTorque to lower: T_lower = (Fd_m/2)\u00b7(\u03c0\u03bcd_m - l)/(\u03c0d_m + \u03bcl)\nLead angle: tan(\u03bb) = l/(\u03c0d_m)\nSelf-locking: \u03bc > tan(\u03bb)\n\n--- Fasteners ---\nBolt load: F_i = 0.75 F_p  (preload)\nJoint stiffness: C = k_b/(k_b+k_m)\nFatigue: \u03c3_a = CF_a/A_t\n\n--- Springs ---\nCoil spring: k = Gd\u2074/(8D\u00b3N)  (G = shear modulus, d = wire dia, D = mean coil dia, N = active coils)\nShear stress: \u03c4 = K_W\u00b78FD/(\u03c0d\u00b3)\nWahl factor: K_W = (4C-1)/(4C-4) + 0.615/C  (C = D/d = spring index)\nDeflection: \u03b4 = 8FD\u00b3N/(Gd\u2074)\n\n--- Gears ---\nGear ratio: N = \u03c9_driver/\u03c9_driven = N_driven/N_driver  (N = number of teeth)\nPitch: P = N/d (diametral pitch), m = d/N (module)\nPitch line velocity: V = \u03c0dN/12  (ft/min, d in inches, N in rpm)\nTransmitted load: W_t = 33000\u00b7HP/V  (HP, ft/min)\nLewis equation: \u03c3 = W_t/(F\u00b7m\u00b7Y)  (Y = Lewis form factor)\n\n--- Bearings ---\nLife: L\u2081\u2080 = (C/P)\u00b3 \u00d7 10\u2076 rev  (ball bearings, exponent=3)\n       L\u2081\u2080 = (C/P)^(10/3) \u00d7 10\u2076 rev  (roller bearings)\nC = dynamic load rating, P = equivalent load\nP = XVFr + YFa  (V=1 for inner ring rotation)\n\n--- Brakes & Clutches ---\nDisk clutch: T = \u03bcF\u00b7(2/3)\u00b7(r_o\u00b3-r_i\u00b3)/(r_o\u00b2-r_i\u00b2)\nBand brake: F_tight/F_slack = e^(\u03bc\u03b8)\n\n================================================================\n11. ENGINEERING ECONOMICS\n================================================================\n\n--- Interest Formulas ---\nSingle payment:\n  F = P(1+i)\u207f  [F/P factor]\n  P = F(1+i)^(-n)  [P/F factor]\n\nUniform series:\n  F = A[(1+i)\u207f-1]/i  [F/A factor]\n  P = A[(1+i)\u207f-1]/[i(1+i)\u207f]  [P/A factor]\n  A = P[i(1+i)\u207f]/[(1+i)\u207f-1]  [A/P factor]\n\nGradient series:\n  P = G[((1+i)\u207f-in-1)/(i\u00b2(1+i)\u207f)]  [P/G factor]\n\nContinuous compounding:\n  F = Pe^(rn)  (r = nominal rate)\n  Effective rate: i_eff = e^r - 1\n\n--- Decision Methods ---\nNPW (Net Present Worth): NPW > 0 \u2192 accept\nAW (Annual Worth): AW > 0 \u2192 accept\nIRR: rate where NPW = 0; accept if IRR > MARR\nBenefit-Cost ratio: B/C > 1 \u2192 accept\n\n--- Depreciation ---\nStraight line: d = (C-S)/n  per year\nMACRS: use IRS table percentages\nBook value: BV = C - \u03a3d\u2c7c\n\n--- Breakeven ---\nRevenue = Fixed Cost + Variable Cost\nQ_BE = FC/(price - VC per unit)\n\n================================================================\n12. MEASUREMENT & INSTRUMENTATION\n================================================================\n\n--- Sensors ---\nThermocouple: voltage proportional to \u0394T\nRTD: resistance increases with temperature\nStrain gauge: \u0394R/R = GF\u00b7\u03b5  (GF = gauge factor \u2248 2)\nWheatstone bridge: V_out = V_in\u00b7\u0394R/(4R)  (for small \u0394R)\n\n--- Signal Processing ---\nNyquist: sampling rate \u2265 2\u00b7f_max\nAliasing: occurs if sampling rate < 2\u00b7f_max\nFFT: converts time domain to frequency domain\n\n--- Control Systems ---\nTransfer function: G(s) = output/input (Laplace domain)\nFirst order: G(s) = K/(\u03c4s+1), \u03c4 = time constant\nSecond order: G(s) = \u03c9\u2099\u00b2/(s\u00b2+2\u03b6\u03c9\u2099s+\u03c9\u2099\u00b2)\n  \u03b6 < 1: underdamped, \u03b6 = 1: critically damped, \u03b6 > 1: overdamped\nPID controller: G_c(s) = Kp + Ki/s + Kds\n\nStability: all poles in left half s-plane\nRouth-Hurwitz criterion: for polynomial stability check\n\n================================================================\nUNIT CONVERSIONS (Key)\n================================================================\n\nLength: 1 ft = 0.3048 m, 1 in = 25.4 mm, 1 mile = 1.609 km\nForce: 1 lbf = 4.448 N, 1 kip = 1000 lbf\nPressure: 1 atm = 101.325 kPa = 14.696 psi, 1 bar = 100 kPa\nEnergy: 1 BTU = 1055 J, 1 kWh = 3600 kJ, 1 ft\u00b7lbf = 1.356 J\nPower: 1 HP = 745.7 W = 550 ft\u00b7lbf/s\nTemperature: \u00b0C = (\u00b0F-32)/1.8, K = \u00b0C + 273.15, \u00b0R = \u00b0F + 459.67\nVolume: 1 gal = 3.785 L, 1 ft\u00b3 = 7.481 gal\nMass: 1 lbm = 0.4536 kg, 1 slug = 14.59 kg\n\n================================================================\nPHYSICAL CONSTANTS\n================================================================\n\ng = 9.81 m/s\u00b2 = 32.2 ft/s\u00b2\nG (gravitational) = 6.674\u00d710\u207b\u00b9\u00b9 N\u00b7m\u00b2/kg\u00b2\nR_u = 8.314 J/(mol\u00b7K)\n\u03c3 (Stefan-Boltzmann) = 5.67\u00d710\u207b\u2078 W/(m\u00b2\u00b7K\u2074)\n\u03c1_water = 1000 kg/m\u00b3 = 62.4 lb/ft\u00b3\n\u03b3_water = 9810 N/m\u00b3 = 62.4 lbf/ft\u00b3\n\u03bc_water at 20\u00b0C = 1.002\u00d710\u207b\u00b3 Pa\u00b7s\nAir at STP: \u03c1 = 1.225 kg/m\u00b3, \u03bc = 1.789\u00d710\u207b\u2075 Pa\u00b7s\n\n================================================================\nEND OF ME FE REFERENCE HANDBOOK\n================================================================\n\n";

app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe-webhook") return next();
  express.json()(req, res, next);
});

app.get("/", (req, res) => res.json({ status: "Gemini Backend v2" }));

app.post("/api/register", async (req, res) => {
  const { device_id, email, name, app_type } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });
  try {
    const { data: existing } = await supabase
      .from("licenses").select("*").eq("device_id", device_id).single();

    if (existing) {
      // Already registered - update app_type if missing
      if (!existing.app_type && app_type) {
        await supabase.from("licenses").update({ app_type }).eq("device_id", device_id);
      }
      return res.json({ registered: true, expires_at: existing.expires_at, is_active: existing.is_active });
    }

    // New registration
    const user_id = crypto.randomUUID();
    const { data, error } = await supabase
      .from("licenses").insert([{ device_id, email: email || null, name: name || null, app_type: app_type || null, user_id, expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }]).select().single();
    if (error) throw error;

    const expiresDate = new Date(data.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // 1. Send welcome email to USER
    if (email) {
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Welcome to FE Exam Prep AI Tutor!",
        text: `Hi ${name || "there"},\n\nYour FE Exam Prep AI Tutor registration is confirmed!\n\nYour AI Tutor is FREE for 3 months.\nExpires: ${expiresDate}\n\nStart studying now and ace your FE Exam!\n\nBest regards,\nFE Exam Prep Team`,
      }).catch(e => console.error("User welcome email error:", e.message));
    }

    // 2. Notify Dr. Um of new registration
    resend.emails.send({
      from: "onboarding@resend.dev",
      to: "dinast.llc.us@gmail.com",
      subject: "[FE Exam App] New User Registration",
      text: `New user registered!\n\nName: ${name || "N/A"}\nEmail: ${email || "N/A"}\nDevice ID: ${device_id}\nApp: ${app_type || "unknown"}\nExpires: ${data.expires_at}\n\nSupabase:\nhttps://supabase.com/dashboard/project/nzljmlimmlewefuhqmhg/editor`,
    }).catch(e => console.error("Admin notification email error:", e.message));

    res.json({ registered: true, expires_at: data.expires_at, is_active: data.is_active });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/check-license", async (req, res) => {
  const { device_id, app_type } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });
  try {
    const { data, error } = await supabase
      .from("licenses").select("expires_at, is_active, app_type").eq("device_id", device_id).single();
    if (error || !data) return res.json({ valid: false, reason: "not_registered" });
    // Backfill app_type if missing
    if (!data.app_type && app_type) {
      await supabase.from("licenses").update({ app_type }).eq("device_id", device_id);
    }
    const expired = new Date(data.expires_at) < new Date();
    const valid = data.is_active && !expired;
    res.json({ valid, expires_at: data.expires_at, reason: !data.is_active ? "deactivated" : expired ? "expired" : null });
  } catch (err) {
    console.error("License error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/request-renewal", async (req, res) => {
  const { device_id, email, name } = req.body;
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "dinast.llc.us@gmail.com",
      subject: "[FE Exam App] AI 튜터 갱신 요청",
      text: `갱신 요청이 들어왔습니다.\n\n이름: ${name || "미입력"}\n이메일: ${email || "미입력"}\n기기 ID: ${device_id}\n\nSupabase에서 만료일을 연장해주세요:\nhttps://supabase.com/dashboard/project/nzljmlimmlewefuhqmhg/editor`,
    });
    res.json({ sent: true });
  } catch (err) {
    console.error("Email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });
  try {
    // Use handbook-enhanced system prompt (Gemini 2.0 Flash auto-caches repeated prefix)
    const systemPrompt = ME_FE_SYSTEM_PROMPT +
      (system ? `\n\nCurrent Problem Context:\n${system}` : "");
    const modelInstance = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat = modelInstance.startChat({ history });
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/save-lrs", async (req, res) => {
  const { device_id, user_name, user_email, app_name, problem_topic, problem_text, message_count, messages } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });

  // Only save if at least 2 messages exchanged
  if (!message_count || message_count < 2) {
    return res.json({ saved: false, reason: "not_enough_messages" });
  }

  try {
    // Generate AI analysis of the learning session
    let analysis = null;
    if (messages && messages.length >= 2) {
      try {
        const sessionText = messages
          .filter(m => m.content && m.role)
          .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
          .join("\n");

        const analysisModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await analysisModel.generateContent(
          `Analyze this FE Exam tutoring session and provide a brief learning report (3-5 sentences max):
          - What topic/concept was studied?
          - Did the student demonstrate understanding?
          - What was the student's learning progress?
          - Any areas needing improvement?

          Session:
          ${sessionText.substring(0, 3000)}`
        );
        analysis = result.response.text();
      } catch (e) {
        console.error("LRS analysis error:", e.message);
        analysis = "Analysis unavailable.";
      }
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from("lrs_reports")
      .insert([{
        device_id,
        user_name: user_name || null,
        user_email: user_email || null,
        app_name: app_name || "ME PM",
        problem_topic: problem_topic || null,
        problem_text: problem_text || null,
        message_count: message_count || 0,
        analysis: analysis || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Notify Dr. Um via email
    if (user_email || user_name) {
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: "dinast.llc.us@gmail.com",
        subject: `[LRS] ${app_name || "FE Exam"} - ${user_name || "Unknown"} Session Report`,
        text: `Learning Session Report\n\nStudent: ${user_name || "N/A"}\nEmail: ${user_email || "N/A"}\nApp: ${app_name || "N/A"}\nTopic: ${problem_topic || "N/A"}\nMessages: ${message_count}\n\nAI Analysis:\n${analysis || "N/A"}\n\nView all reports:\nhttps://supabase.com/dashboard/project/nzljmlimmlewefuhqmhg/editor`,
      }).catch(e => console.error("LRS email error:", e.message));
    }

    res.json({ saved: true, id: data.id });
  } catch (err) {
    console.error("LRS save error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── STRIPE: Create Checkout Session ──
app.post("/api/create-checkout", async (req, res) => {
  const { device_id, email, app_type } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "payment",
      customer_email: email || undefined,
      metadata: { device_id, app_type: app_type || "unknown" },
      success_url: "https://dinast.llc/renewal-success",
      cancel_url: "https://dinast.llc/renewal-cancel",
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── STRIPE: Webhook ──
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { device_id, app_type } = session.metadata;
    const email = session.customer_email;
    try {
      // Update installed_at → Supabase default resets expires_at to now() + 3 months
      const { error } = await supabase
        .from("licenses")
        .update({ installed_at: new Date().toISOString(), is_active: true })
        .eq("device_id", device_id);
      if (error) throw error;
      console.log(`✅ Renewed: device_id=${device_id}, app=${app_type}, email=${email}`);

      // Notify Dr. Um
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: "dinast.llc.us@gmail.com",
        subject: "[FE Exam App] License Renewed - $9.99",
        text: `License renewed!\n\nDevice ID: ${device_id}\nApp: ${app_type || "unknown"}\nEmail: ${email || "N/A"}\nAmount: $9.99\n\nSupabase:\nhttps://supabase.com/dashboard/project/nzljmlimmlewefuhqmhg/editor`,
      }).catch(e => console.error("Renewal email error:", e.message));
    } catch (err) {
      console.error("Renewal update error:", err.message);
    }
  }
  res.json({ received: true });
});

app.listen(PORT, () => console.log("Gemini Backend v2 on port " + PORT));
