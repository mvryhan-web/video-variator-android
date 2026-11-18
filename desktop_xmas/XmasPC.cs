using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("DEEPSYQ Xmas PC · Winter Desktop")]
[assembly: System.Reflection.AssemblyDescription("Xmas PC · Winter Desktop by DEEPSYQ")]
[assembly: System.Reflection.AssemblyCompany("Deepsyq")]
[assembly: System.Reflection.AssemblyProduct("DEEPSYQ Xmas PC · Winter Desktop")]
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]

namespace DeepSyqXmasPC
{
    public class Snowflake { public float X, Y, Vx, Vy, Size, Phase, Angle, Spin; public int Layer; }
    public class SmokePuff { public float X, Y, Vx, Vy, Radius, Alpha; }
    public class SparkParticle { public float X, Y, Vx, Vy, Size, Alpha; public Color Col; }
    public class SnowmanItem { public float X, Y, Scale; public int HatStyle; public int ScarfColor; }
    public class OrnamentItem { public float X, Y; public int Kind; public float Phase; }
    public class LanternItem { public float X, Y, Scale; }

    public class XmasOverlayForm : Form
    {
        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
        [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
        [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr hWnd, int id);
        const int GWL_EXSTYLE = -20;
        const int WS_EX_LAYERED = 0x80000;
        const int WS_EX_TRANSPARENT = 0x20;

        private Timer tickTimer;
        private Random rng = new Random();
        private List<Snowflake> flakes = new List<Snowflake>();
        private List<SmokePuff> smoke = new List<SmokePuff>();
        private List<SparkParticle> spray = new List<SparkParticle>();
        private List<SnowmanItem> snowmen = new List<SnowmanItem>();
        private List<OrnamentItem> ornaments = new List<OrnamentItem>();
        private List<LanternItem> lanterns = new List<LanternItem>();
        private float[] snowBank;
        private int bankCols = 220;

        private Image nightBg = null;
        private Image dayBg = null;
        private bool isNight = true;
        private bool showScenicHouse = true;
        private bool clickThrough = false;
        private float timeSec = 0f;

        private bool santaActive = true;
        private float santaX = -260f, santaY = 85f, santaCooldown = 0f;
        private float tractorX = 200f, tractorDir = 1f;

        private Point lastMouse = Point.Empty;
        private SnowmanItem draggedSnowman = null;
        private OrnamentItem draggedOrnament = null;
        private LanternItem draggedLantern = null;
        private Panel hudBar;
        private ContextMenu decorMenu;
        private Button timeBtn;
        private NotifyIcon trayIcon;

        public XmasOverlayForm()
        {
            Text = "DEEPSYQ · Xmas PC · Winter Desktop";
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            TopMost = true;
            DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
            BackColor = Color.FromArgb(8, 14, 28);

            try
            {
                var asm = System.Reflection.Assembly.GetExecutingAssembly();
                var sNight = asm.GetManifestResourceStream("DeepSyqXmasPC.night.jpg");
                if (sNight != null) nightBg = Image.FromStream(sNight);
                var sDay = asm.GetManifestResourceStream("DeepSyqXmasPC.day.jpg");
                if (sDay != null) dayBg = Image.FromStream(sDay);
            }
            catch { }

            Rectangle bounds = Screen.PrimaryScreen.Bounds;
            Width = bounds.Width;
            Height = bounds.Height;

            snowBank = new float[bankCols];
            for (int i = 0; i < bankCols; i++)
                snowBank[i] = 16f + (float)Math.Sin(i * 0.15) * 4f;

            for (int i = 0; i < 210; i++)
                flakes.Add(MakeFlake(true));

            snowmen.Add(new SnowmanItem { X = Width * 0.48f, Y = Height - 36f, Scale = 1.0f, HatStyle = 0, ScarfColor = 0 });

            // Movable 3D Night Lanterns on fence posts & foreground snow
            lanterns.Add(new LanternItem { X = Width * 0.567f, Y = Height * 0.668f, Scale = 0.9f });
            lanterns.Add(new LanternItem { X = Width * 0.731f, Y = Height * 0.668f, Scale = 0.9f });
            lanterns.Add(new LanternItem { X = Width * 0.29f, Y = Height - 44f, Scale = 1.05f });

            // Movable 3D Garlands on house roof & right pine tree
            float[,] initGarlands = new float[,] {
                { 0.25f, 0.30f }, { 0.34f, 0.21f }, { 0.39f, 0.33f }, { 0.31f, 0.49f },
                { 0.94f, 0.36f }, { 0.91f, 0.48f }, { 0.95f, 0.56f }, { 0.90f, 0.66f }, { 0.95f, 0.74f }
            };
            for (int i = 0; i < initGarlands.GetLength(0); i++)
            {
                ornaments.Add(new OrnamentItem
                {
                    X = Width * initGarlands[i, 0],
                    Y = Height * initGarlands[i, 1],
                    Kind = i % 4,
                    Phase = i * 0.8f
                });
            }

            BuildCleanHud();
            BuildTrayIcon();

            MouseMove += OnCanvasMouseMove;
            MouseDown += OnCanvasMouseDown;
            MouseUp += OnCanvasMouseUp;
            KeyDown += (s, e) => { if (e.KeyCode == Keys.Escape) Close(); else if (e.KeyCode == Keys.F8) ToggleClickThrough(); };

            tickTimer = new Timer { Interval = 16 };
            tickTimer.Tick += (s, e) => { StepSimulation(0.016f); Invalidate(); };
            tickTimer.Start();
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try { RegisterHotKey(Handle, 9001, 0, (uint)Keys.F8); } catch { }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            try { UnregisterHotKey(Handle, 9001); } catch { }
            if (trayIcon != null) { trayIcon.Visible = false; trayIcon.Dispose(); }
            base.OnFormClosing(e);
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == 0x0312 && m.WParam.ToInt32() == 9001)
                ToggleClickThrough();
            base.WndProc(ref m);
        }

        private void BuildCleanHud()
        {
            decorMenu = new ContextMenu();
            decorMenu.MenuItems.Add("⛄ Слепить 3D-снеговика", (s, e) => AddSnowman());
            decorMenu.MenuItems.Add("🏮 Добавить ночной светильник (фонарь)", (s, e) => AddLantern());
            decorMenu.MenuItems.Add("🎄 Добавить 3D-гирлянду на ёлку", (s, e) => AddOrnament());
            decorMenu.MenuItems.Add("🚜 Пустить снегоуборочный трактор", (s, e) => TriggerTractor());
            decorMenu.MenuItems.Add("🎅 Запустить Санту на санях", (s, e) => TriggerSanta());
            decorMenu.MenuItems.Add("-");
            decorMenu.MenuItems.Add("🪟 Режим: Зимняя сцена / Поверх окон", (s, e) => ToggleSceneMode());
            decorMenu.MenuItems.Add("🖱️ Сквозные клики (F8)", (s, e) => ToggleClickThrough());
            decorMenu.MenuItems.Add("✕ Выход", (s, e) => Close());

            hudBar = new Panel
            {
                Height = 40,
                Width = 370,
                Top = 16,
                Left = 18,
                BackColor = Color.FromArgb(215, 10, 16, 30)
            };

            Button menuBtn = MakeHudBtn("✨ Украсить сцену ▾", 8);
            menuBtn.Click += (s, e) => decorMenu.Show(menuBtn, new Point(0, menuBtn.Height + 4));
            hudBar.Controls.Add(menuBtn);

            timeBtn = MakeHudBtn("🌙 Ночь", menuBtn.Right + 8);
            timeBtn.Click += (s, e) =>
            {
                isNight = !isNight;
                timeBtn.Text = isNight ? "🌙 Ночь" : "☀️ День";
            };
            hudBar.Controls.Add(timeBtn);

            Button exitBtn = MakeHudBtn("✕", timeBtn.Right + 8);
            exitBtn.Width = 34;
            exitBtn.Click += (s, e) => Close();
            hudBar.Controls.Add(exitBtn);

            hudBar.Width = exitBtn.Right + 8;
            Controls.Add(hudBar);
        }

        private Button MakeHudBtn(string text, int x)
        {
            Button b = new Button
            {
                Text = text,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.FromArgb(245, 208, 138),
                BackColor = Color.FromArgb(20, 30, 50),
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                AutoSize = true,
                Height = 28,
                Location = new Point(x, 6),
                Cursor = Cursors.Hand
            };
            b.FlatAppearance.BorderColor = Color.FromArgb(214, 173, 99);
            b.FlatAppearance.BorderSize = 1;
            return b;
        }

        private void BuildTrayIcon()
        {
            trayIcon = new NotifyIcon
            {
                Text = "DEEPSYQ · Xmas PC · Winter Desktop (F8)",
                Icon = SystemIcons.Application,
                ContextMenu = decorMenu,
                Visible = true
            };
            trayIcon.DoubleClick += (s, e) => { if (clickThrough) ToggleClickThrough(); };
        }

        private void ToggleSceneMode()
        {
            showScenicHouse = !showScenicHouse;
            if (!showScenicHouse)
            {
                BackColor = Color.Black;
                TransparencyKey = Color.Black;
            }
            else
            {
                TransparencyKey = Color.Empty;
                BackColor = Color.FromArgb(8, 14, 28);
            }
        }

        private void ToggleClickThrough()
        {
            clickThrough = !clickThrough;
            int ex = GetWindowLong(Handle, GWL_EXSTYLE);
            if (clickThrough)
            {
                if (showScenicHouse) ToggleSceneMode();
                SetWindowLong(Handle, GWL_EXSTYLE, ex | WS_EX_LAYERED | WS_EX_TRANSPARENT);
                hudBar.Visible = false;
            }
            else
            {
                SetWindowLong(Handle, GWL_EXSTYLE, ex & ~WS_EX_TRANSPARENT);
                hudBar.Visible = true;
            }
        }

        private void AddSnowman()
        {
            snowmen.Add(new SnowmanItem
            {
                X = rng.Next((int)(Width * 0.35), (int)(Width * 0.78)),
                Y = Height - 36f,
                Scale = 0.88f + (float)rng.NextDouble() * 0.25f,
                HatStyle = rng.Next(0, 2),
                ScarfColor = rng.Next(0, 3)
            });
        }

        private void AddLantern()
        {
            lanterns.Add(new LanternItem
            {
                X = rng.Next((int)(Width * 0.38), (int)(Width * 0.78)),
                Y = Height - 42f,
                Scale = 0.95f
            });
        }

        private void AddOrnament()
        {
            for (int k = 0; k < 3; k++)
            {
                ornaments.Add(new OrnamentItem
                {
                    X = Width * 0.90f + rng.Next(-35, 36),
                    Y = Height * 0.45f + rng.Next(-90, 91),
                    Kind = rng.Next(0, 4),
                    Phase = (float)(rng.NextDouble() * 6.28)
                });
            }
        }

        private void TriggerTractor()
        {
            tractorDir = tractorX > Width * 0.5f ? -1f : 1f;
        }

        private void TriggerSanta()
        {
            santaActive = true;
            santaX = -260f;
            santaY = 75f + rng.Next(0, 50);
        }

        private Snowflake MakeFlake(bool randomY)
        {
            int layer = rng.NextDouble() < 0.18 ? 2 : (rng.NextDouble() < 0.55 ? 1 : 0);
            return new Snowflake
            {
                X = (float)(rng.NextDouble() * Width),
                Y = randomY ? (float)(rng.NextDouble() * Height) : -14f,
                Vx = (float)(rng.NextDouble() - 0.5) * (18f + layer * 10f),
                Vy = 30f + layer * 26f + (float)rng.NextDouble() * 28f,
                Size = layer == 2 ? 9f : (layer == 1 ? 6f : 3f),
                Layer = layer,
                Angle = (float)(rng.NextDouble() * 6.28),
                Spin = (float)(rng.NextDouble() - 0.5) * 1.8f,
                Phase = (float)(rng.NextDouble() * 6.28)
            };
        }

        private void OnCanvasMouseDown(object sender, MouseEventArgs e)
        {
            for (int i = ornaments.Count - 1; i >= 0; i--)
            {
                var o = ornaments[i];
                if (Math.Abs(e.X - o.X) < 22 && Math.Abs(e.Y - o.Y) < 22)
                {
                    draggedOrnament = o;
                    return;
                }
            }
            for (int i = lanterns.Count - 1; i >= 0; i--)
            {
                var l = lanterns[i];
                if (Math.Abs(e.X - l.X) < 24 && Math.Abs(e.Y - (l.Y - 18)) < 34)
                {
                    draggedLantern = l;
                    return;
                }
            }
            for (int i = snowmen.Count - 1; i >= 0; i--)
            {
                var sm = snowmen[i];
                if (Math.Abs(e.X - sm.X) < 38 * sm.Scale && e.Y >= sm.Y - 105 * sm.Scale && e.Y <= sm.Y + 12)
                {
                    sm.HatStyle = (sm.HatStyle + 1) % 2;
                    sm.ScarfColor = (sm.ScarfColor + 1) % 3;
                    draggedSnowman = sm;
                    return;
                }
            }
        }

        private void OnCanvasMouseUp(object sender, MouseEventArgs e)
        {
            draggedSnowman = null;
            draggedOrnament = null;
            draggedLantern = null;
        }

        private void OnCanvasMouseMove(object sender, MouseEventArgs e)
        {
            if (draggedOrnament != null)
            {
                draggedOrnament.X = e.X;
                draggedOrnament.Y = e.Y;
                return;
            }
            if (draggedLantern != null)
            {
                draggedLantern.X = e.X;
                draggedLantern.Y = e.Y;
                return;
            }
            if (draggedSnowman != null)
            {
                draggedSnowman.X = e.X;
                draggedSnowman.Y = Math.Min(Height - 32f, Math.Max(Height * 0.65f, e.Y));
                return;
            }

            float dx = e.X - lastMouse.X;
            float dy = e.Y - lastMouse.Y;
            float speed = (float)Math.Sqrt(dx * dx + dy * dy);
            lastMouse = e.Location;

            int col = (int)((e.X / (float)Math.Max(1, Width)) * bankCols);
            if (col >= 0 && col < bankCols && e.Y >= Height - 80 - snowBank[col])
            {
                for (int c = Math.Max(0, col - 4); c <= Math.Min(bankCols - 1, col + 4); c++)
                {
                    float cut = Math.Max(0f, 5.5f - Math.Abs(c - col) * 1.1f);
                    if (snowBank[c] > 4f)
                        snowBank[c] = Math.Max(4f, snowBank[c] - cut * 0.45f);
                }
                int count = Math.Min(12, 3 + (int)(speed * 0.25f));
                for (int k = 0; k < count; k++)
                {
                    spray.Add(new SparkParticle
                    {
                        X = e.X + rng.Next(-12, 13),
                        Y = Math.Min(Height - 30f, e.Y + rng.Next(-6, 6)),
                        Vx = dx * 0.25f + (float)(rng.NextDouble() - 0.5) * 95f,
                        Vy = -40f - (float)rng.NextDouble() * 90f,
                        Size = 3f + (float)rng.NextDouble() * 4f,
                        Alpha = 1f,
                        Col = Color.White
                    });
                }
            }
        }

        private void StepSimulation(float dt)
        {
            timeSec += dt;

            for (int i = 0; i < flakes.Count; i++)
            {
                var f = flakes[i];
                f.Y += f.Vy * dt;
                f.X += (f.Vx + (float)Math.Sin(timeSec * 1.6f + f.Phase) * 16f) * dt;
                f.Angle += f.Spin * dt;
                if (f.X < 0) f.X += Width;
                if (f.X >= Width) f.X -= Width;

                int col = (int)((f.X / Math.Max(1f, Width)) * bankCols);
                float groundY = Height - 28f - (col >= 0 && col < bankCols ? snowBank[col] : 16f);
                if (f.Y >= groundY)
                {
                    if (col >= 0 && col < bankCols && snowBank[col] < 50f)
                        snowBank[col] += 0.20f;
                    flakes[i] = MakeFlake(false);
                }
            }

            for (int i = 1; i < bankCols - 1; i++)
                snowBank[i] = snowBank[i] * 0.992f + (snowBank[i - 1] + snowBank[i + 1]) * 0.004f;

            // Chimney smoke aligned to the stone chimney on the left cabin (18.8% X, 18.5% Y)
            float chimneyX = Width * 0.188f;
            float chimneyY = Height * 0.185f;
            if (rng.NextDouble() < 0.4)
            {
                smoke.Add(new SmokePuff
                {
                    X = chimneyX + rng.Next(-5, 6),
                    Y = chimneyY,
                    Vx = 14f + (float)rng.NextDouble() * 12f,
                    Vy = -24f - (float)rng.NextDouble() * 14f,
                    Radius = 9f,
                    Alpha = 0.52f
                });
            }
            for (int i = smoke.Count - 1; i >= 0; i--)
            {
                var p = smoke[i];
                p.X += (p.Vx + (float)Math.Sin(timeSec * 2f + i) * 6f) * dt;
                p.Y += p.Vy * dt;
                p.Radius += 12f * dt;
                p.Alpha -= 0.13f * dt;
                if (p.Alpha <= 0.02f) smoke.RemoveAt(i);
            }

            if (santaActive)
            {
                santaX += 125f * dt;
                santaY += (float)Math.Sin(timeSec * 2.4f) * 12f * dt;
                if (rng.NextDouble() < 0.7)
                {
                    spray.Add(new SparkParticle
                    {
                        X = santaX + 20f,
                        Y = santaY + 18f,
                        Vx = -30f + rng.Next(-15, 16),
                        Vy = rng.Next(-10, 20),
                        Size = 3.5f,
                        Alpha = 0.95f,
                        Col = Color.FromArgb(255, 224, 130)
                    });
                }
                if (santaX > Width + 320f)
                {
                    santaActive = false;
                    santaCooldown = 22f;
                }
            }
            else
            {
                santaCooldown -= dt;
                if (santaCooldown <= 0f)
                {
                    santaActive = true;
                    santaX = -280f;
                    santaY = 70f + rng.Next(0, 50);
                }
            }

            tractorX += 76f * tractorDir * dt;
            int tCol = (int)((tractorX / Math.Max(1f, Width)) * bankCols);
            for (int c = Math.Max(0, tCol - 3); c <= Math.Min(bankCols - 1, tCol + 3); c++)
            {
                if (snowBank[c] > 7f)
                {
                    float rem = snowBank[c] - 7f;
                    snowBank[c] = 7f;
                    int ahead = Math.Min(bankCols - 1, Math.Max(0, c + (tractorDir > 0 ? 5 : -5)));
                    snowBank[ahead] = Math.Min(54f, snowBank[ahead] + rem * 0.36f);
                }
            }
            if (tractorX > Width - 90f) tractorDir = -1f;
            if (tractorX < 90f) tractorDir = 1f;

            for (int i = spray.Count - 1; i >= 0; i--)
            {
                var sp = spray[i];
                sp.X += sp.Vx * dt;
                sp.Y += sp.Vy * dt;
                sp.Vy += 180f * dt;
                sp.Alpha -= 0.9f * dt;
                if (sp.Alpha <= 0.03f) spray.RemoveAt(i);
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            if (showScenicHouse)
            {
                Image bg = isNight ? nightBg : dayBg;
                if (bg != null)
                    g.DrawImage(bg, 0, 0, Width, Height);
            }

            foreach (var p in smoke)
            {
                int a = Math.Max(0, Math.Min(255, (int)(p.Alpha * 180)));
                using (SolidBrush sb = new SolidBrush(Color.FromArgb(a, 225, 235, 248)))
                    g.FillEllipse(sb, p.X - p.Radius, p.Y - p.Radius, p.Radius * 2, p.Radius * 2);
            }

            if (santaActive)
                DrawSantaSleigh(g, santaX, santaY);

            foreach (var o in ornaments)
                DrawOrnament(g, o);

            foreach (var l in lanterns)
                DrawLantern(g, l);

            foreach (var sm in snowmen)
                DrawSnowman(g, sm);

            DrawSnowbank(g);
            DrawTractor(g, tractorX, Height - 32f, tractorDir);

            foreach (var sp in spray)
            {
                int a = Math.Max(0, Math.Min(255, (int)(sp.Alpha * 255)));
                using (SolidBrush b = new SolidBrush(Color.FromArgb(a, sp.Col)))
                    g.FillEllipse(b, sp.X - sp.Size * 0.5f, sp.Y - sp.Size * 0.5f, sp.Size, sp.Size);
            }

            foreach (var f in flakes)
                DrawCrystalFlake(g, f);
        }

        private void DrawCrystalFlake(Graphics g, Snowflake f)
        {
            if (f.Layer == 1)
            {
                GraphicsState st = g.Save();
                g.TranslateTransform(f.X, f.Y);
                g.RotateTransform(f.Angle * 57.3f);
                using (Pen p = new Pen(Color.FromArgb(225, 255, 255, 255), 1.4f))
                {
                    float r = f.Size;
                    g.DrawLine(p, -r, 0, r, 0);
                    g.DrawLine(p, 0, -r, 0, r);
                    g.DrawLine(p, -r * 0.7f, -r * 0.7f, r * 0.7f, r * 0.7f);
                    g.DrawLine(p, -r * 0.7f, r * 0.7f, r * 0.7f, -r * 0.7f);
                }
                g.Restore(st);
            }
            else
            {
                int alpha = f.Layer == 2 ? 175 : 210;
                using (SolidBrush fb = new SolidBrush(Color.FromArgb(alpha, 255, 255, 255)))
                    g.FillEllipse(fb, f.X - f.Size * 0.5f, f.Y - f.Size * 0.5f, f.Size, f.Size);
            }
        }

        private void DrawLantern(Graphics g, LanternItem l)
        {
            float x = l.X, y = l.Y, s = l.Scale;
            using (SolidBrush halo = new SolidBrush(Color.FromArgb(85, 255, 200, 90)))
                g.FillEllipse(halo, x - 36 * s, y - 48 * s, 72 * s, 72 * s);
            using (SolidBrush frame = new SolidBrush(Color.FromArgb(28, 25, 23)))
            {
                g.FillRectangle(frame, x - 12 * s, y - 5 * s, 24 * s, 5 * s);
                g.FillPolygon(frame, new PointF[] { new PointF(x - 14 * s, y - 28 * s), new PointF(x, y - 40 * s), new PointF(x + 14 * s, y - 28 * s) });
            }
            using (SolidBrush glass = new SolidBrush(Color.FromArgb(255, 215, 100)))
                g.FillRectangle(glass, x - 9 * s, y - 28 * s, 18 * s, 23 * s);
            using (SolidBrush snow = new SolidBrush(Color.FromArgb(245, 250, 255)))
                g.FillEllipse(snow, x - 11 * s, y - 38 * s, 22 * s, 7 * s);
        }

        private void DrawSantaSleigh(Graphics g, float x, float y)
        {
            using (SolidBrush red = new SolidBrush(Color.FromArgb(210, 38, 48)))
                g.FillPolygon(red, new PointF[] {
                    new PointF(x, y + 10), new PointF(x + 56, y + 10),
                    new PointF(x + 68, y + 28), new PointF(x - 8, y + 28)
                });
            using (Pen runner = new Pen(Color.FromArgb(245, 208, 125), 2.5f))
            {
                g.DrawLine(runner, x - 12, y + 32, x + 74, y + 32);
                g.DrawLine(runner, x + 64, y + 18, x + 155, y + 14);
            }
            for (int r = 0; r < 2; r++)
            {
                float rx = x + 95 + r * 48;
                float ry = y + 6 + (float)Math.Sin(timeSec * 8f + r) * 4f;
                using (SolidBrush deer = new SolidBrush(Color.FromArgb(135, 80, 42)))
                {
                    g.FillEllipse(deer, rx, ry + 4, 28, 13);
                    g.FillEllipse(deer, rx + 22, ry - 3, 12, 10);
                }
            }
        }

        private void DrawSnowman(Graphics g, SnowmanItem sm)
        {
            float s = sm.Scale, x = sm.X, y = sm.Y;
            using (SolidBrush snow = new SolidBrush(Color.FromArgb(246, 250, 255)))
            {
                g.FillEllipse(snow, x - 26 * s, y - 42 * s, 52 * s, 46 * s);
                g.FillEllipse(snow, x - 19 * s, y - 72 * s, 38 * s, 36 * s);
                g.FillEllipse(snow, x - 14 * s, y - 95 * s, 28 * s, 26 * s);
            }
            using (SolidBrush carrot = new SolidBrush(Color.FromArgb(249, 115, 22)))
                g.FillPolygon(carrot, new PointF[] { new PointF(x, y - 82 * s), new PointF(x + 15 * s, y - 79 * s), new PointF(x, y - 76 * s) });
            Color[] scarfCols = new Color[] { Color.FromArgb(220, 38, 38), Color.FromArgb(16, 185, 129), Color.FromArgb(234, 179, 8) };
            using (SolidBrush sc = new SolidBrush(scarfCols[sm.ScarfColor % scarfCols.Length]))
            {
                g.FillRectangle(sc, x - 14 * s, y - 72 * s, 28 * s, 7 * s);
                g.FillRectangle(sc, x + 4 * s, y - 70 * s, 6 * s, 18 * s);
            }
            using (SolidBrush hat = new SolidBrush(Color.FromArgb(20, 26, 38)))
            {
                g.FillRectangle(hat, x - 17 * s, y - 97 * s, 34 * s, 5 * s);
                g.FillRectangle(hat, x - 11 * s, y - 116 * s, 22 * s, 19 * s);
            }
        }

        private void DrawOrnament(Graphics g, OrnamentItem o)
        {
            Color[] cols = new Color[] { Color.FromArgb(251, 191, 36), Color.FromArgb(244, 63, 94), Color.FromArgb(16, 185, 129), Color.FromArgb(253, 224, 71) };
            Color c = cols[o.Kind % cols.Length];
            float pulse = 0.65f + 0.35f * (float)Math.Sin(timeSec * 4.5f + o.Phase);
            using (SolidBrush glow = new SolidBrush(Color.FromArgb((int)(pulse * 125), c)))
                g.FillEllipse(glow, o.X - 18f, o.Y - 18f, 36f, 36f);
            using (SolidBrush ball = new SolidBrush(c))
                g.FillEllipse(ball, o.X - 9f, o.Y - 9f, 18f, 18f);
            using (SolidBrush hi = new SolidBrush(Color.FromArgb(210, 255, 255, 255)))
                g.FillEllipse(hi, o.X - 5f, o.Y - 5f, 5f, 5f);
        }

        private void DrawSnowbank(Graphics g)
        {
            PointF[] poly = new PointF[bankCols + 2];
            for (int i = 0; i < bankCols; i++)
            {
                float x = (i / (float)(bankCols - 1)) * Width;
                poly[i] = new PointF(x, Height - 26f - snowBank[i]);
            }
            poly[bankCols] = new PointF(Width, Height);
            poly[bankCols + 1] = new PointF(0, Height);
            using (SolidBrush sb = new SolidBrush(Color.FromArgb(242, 248, 255)))
                g.FillPolygon(sb, poly);
        }

        private void DrawTractor(Graphics g, float x, float y, float dir)
        {
            GraphicsState st = g.Save();
            g.TranslateTransform(x, y);
            if (dir < 0) g.ScaleTransform(-1f, 1f);
            PointF[] beam = new PointF[] { new PointF(30, -14), new PointF(135, -38), new PointF(135, 6) };
            using (SolidBrush hb = new SolidBrush(Color.FromArgb(65, 255, 235, 145)))
                g.FillPolygon(hb, beam);
            using (SolidBrush body = new SolidBrush(Color.FromArgb(234, 179, 8)))
            {
                g.FillRectangle(body, -28, -26, 50, 18);
                g.FillRectangle(body, -22, -44, 26, 20);
            }
            using (SolidBrush blade = new SolidBrush(Color.FromArgb(220, 38, 38)))
                g.FillPolygon(blade, new PointF[] { new PointF(24, -26), new PointF(36, -28), new PointF(40, 2), new PointF(24, 0) });
            using (SolidBrush tire = new SolidBrush(Color.FromArgb(20, 25, 35)))
            {
                g.FillEllipse(tire, -26, -14, 22, 22);
                g.FillEllipse(tire, 6, -10, 18, 18);
            }
            g.Restore(st);
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new XmasOverlayForm());
        }
    }
}
