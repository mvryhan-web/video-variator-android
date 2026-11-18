using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("DEEPSYQ Xmas PC")]
[assembly: System.Reflection.AssemblyDescription("Interactive Winter Desktop & Holiday Atmosphere by DEEPSYQ")]
[assembly: System.Reflection.AssemblyCompany("DEEPSYQ Creative Studio")]
[assembly: System.Reflection.AssemblyProduct("DEEPSYQ Xmas PC")]
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]

namespace DeepSyqXmasPC
{
    public class Snowflake { public float X, Y, Vx, Vy, Size, Phase; }
    public class SmokePuff { public float X, Y, Vx, Vy, Radius, Alpha; }
    public class SparkParticle { public float X, Y, Vx, Vy, Size, Alpha; public Color Col; }
    public class SnowmanItem { public float X, Y, Scale; public int HatStyle; public int ScarfColor; public bool Dragging; }
    public class OrnamentItem { public float X, Y; public int Kind; public float Phase; public bool Dragging; }

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
        private float[] snowBank;
        private int bankCols = 240;

        private bool showScenicHouse = true;
        private bool clickThrough = false;
        private Image customBg = null;
        private float timeSec = 0f;

        // Santa sleigh state
        private bool santaActive = true;
        private float santaX = -260f, santaY = 110f, santaDir = 1f;

        // Tractor snowplow state
        private bool tractorActive = true;
        private float tractorX = 80f, tractorDir = 1f;

        private Point lastMouse = Point.Empty;
        private SnowmanItem draggedSnowman = null;
        private OrnamentItem draggedOrnament = null;
        private Panel controlBar;
        private NotifyIcon trayIcon;
        private Label statusLbl;

        public XmasOverlayForm()
        {
            Text = "DEEPSYQ Xmas PC — Interactive Winter Desktop";
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            TopMost = true;
            DoubleBuffered = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
            BackColor = Color.FromArgb(11, 18, 33);

            try {
                var asm = System.Reflection.Assembly.GetExecutingAssembly();
                var st = asm.GetManifestResourceStream("DeepSyqXmasPC.bg.jpg");
                if (st != null) customBg = Image.FromStream(st);
            } catch { }
            Rectangle bounds = Screen.PrimaryScreen.Bounds;
            Width = bounds.Width;
            Height = bounds.Height;

            snowBank = new float[bankCols];
            for (int i = 0; i < bankCols; i++)
                snowBank[i] = 18f + (float)Math.Sin(i * 0.18) * 5f;

            for (int i = 0; i < 240; i++)
                flakes.Add(MakeFlake(true));

            // Initial snowmen & tree garlands
            snowmen.Add(new SnowmanItem { X = Width * 0.27f, Y = Height - 54f, Scale = 1.0f, HatStyle = 0, ScarfColor = 0 });
            snowmen.Add(new SnowmanItem { X = Width * 0.74f, Y = Height - 54f, Scale = 0.88f, HatStyle = 1, ScarfColor = 1 });

            // Default garlands & ornaments on left and right pine trees
            float[] treeXs = new float[] { Width * 0.11f, Width * 0.15f, Width * 0.84f, Width * 0.89f };
            for (int t = 0; t < treeXs.Length; t++)
            {
                for (int k = 0; k < 4; k++)
                {
                    ornaments.Add(new OrnamentItem
                    {
                        X = treeXs[t] + rng.Next(-32, 33),
                        Y = Height - 130f - k * 36f + rng.Next(-8, 9),
                        Kind = (t + k) % 4,
                        Phase = (float)(rng.NextDouble() * 6.28)
                    });
                }
            }

            BuildControlBar();
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

        private void BuildControlBar()
        {
            controlBar = new Panel
            {
                Height = 44,
                Width = 980,
                Top = 14,
                Left = Math.Max(12, (Width - 980) / 2),
                BackColor = Color.FromArgb(220, 14, 20, 32)
            };
            controlBar.Anchor = AnchorStyles.Top;

            int x = 12;
            statusLbl = new Label
            {
                Text = "❄️ DEEPSYQ XMAS PC",
                ForeColor = Color.FromArgb(245, 208, 138),
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(x, 13)
            };
            controlBar.Controls.Add(statusLbl);
            x += 150;

            x = AddBtn("🏔️ Сцена / Оверлей", x, (s, e) => ToggleSceneMode());
            x = AddBtn("⛄ + Снеговик", x, (s, e) => AddSnowman());
            x = AddBtn("🎄 + Гирлянда", x, (s, e) => AddOrnament());
            x = AddBtn("🚜 Трактор", x, (s, e) => TriggerTractor());
            x = AddBtn("🎅 Санта", x, (s, e) => TriggerSanta());
            x = AddBtn("🖼️ Свой фон", x, (s, e) => LoadCustomBackground());
            x = AddBtn("🖱️ Сквозные клики (F8)", x, (s, e) => ToggleClickThrough());
            x = AddBtn("✕ Выход", x, (s, e) => Close());

            controlBar.Width = x + 10;
            controlBar.Left = Math.Max(12, (Width - controlBar.Width) / 2);
            Controls.Add(controlBar);
        }

        private int AddBtn(string text, int x, EventHandler onClick)
        {
            Button b = new Button
            {
                Text = text,
                FlatStyle = FlatStyle.Flat,
                ForeColor = Color.White,
                BackColor = Color.FromArgb(30, 41, 59),
                Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                AutoSize = true,
                Height = 30,
                Location = new Point(x, 7),
                Cursor = Cursors.Hand
            };
            b.FlatAppearance.BorderColor = Color.FromArgb(214, 173, 99);
            b.FlatAppearance.BorderSize = 1;
            b.Click += onClick;
            controlBar.Controls.Add(b);
            return b.Right + 6;
        }

        private void BuildTrayIcon()
        {
            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Переключить: Зимний дом / Поверх окон", (s, e) => ToggleSceneMode());
            menu.MenuItems.Add("Сквозные клики вкл/выкл (F8)", (s, e) => ToggleClickThrough());
            menu.MenuItems.Add("Слепить снеговика", (s, e) => AddSnowman());
            menu.MenuItems.Add("Вызвать снегоуборочный трактор", (s, e) => TriggerTractor());
            menu.MenuItems.Add("Запустить Санту с оленями", (s, e) => TriggerSanta());
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Выход", (s, e) => Close());

            trayIcon = new NotifyIcon
            {
                Text = "DEEPSYQ Xmas PC (F8 — сквозные клики)",
                Icon = SystemIcons.Application,
                ContextMenu = menu,
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
                BackColor = Color.FromArgb(11, 18, 33);
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
                controlBar.Visible = false;
                trayIcon.ShowBalloonTip(2000, "DEEPSYQ Xmas PC", "Режим сквозных кликов включён. Нажмите F8, чтобы вернуть панель управления.", ToolTipIcon.Info);
            }
            else
            {
                SetWindowLong(Handle, GWL_EXSTYLE, ex & ~WS_EX_TRANSPARENT);
                controlBar.Visible = true;
            }
        }

        private void AddSnowman()
        {
            snowmen.Add(new SnowmanItem
            {
                X = rng.Next((int)(Width * 0.18), (int)(Width * 0.82)),
                Y = Height - 54f,
                Scale = 0.85f + (float)rng.NextDouble() * 0.3f,
                HatStyle = rng.Next(0, 2),
                ScarfColor = rng.Next(0, 3)
            });
        }

        private void AddOrnament()
        {
            ornaments.Add(new OrnamentItem
            {
                X = Width * 0.5f + rng.Next(-160, 161),
                Y = Height * 0.55f + rng.Next(-60, 61),
                Kind = rng.Next(0, 4),
                Phase = (float)(rng.NextDouble() * 6.28)
            });
        }

        private void TriggerTractor()
        {
            tractorActive = true;
            tractorDir = tractorX > Width * 0.5f ? -1f : 1f;
        }

        private void TriggerSanta()
        {
            santaActive = true;
            santaDir = 1f;
            santaX = -240f;
            santaY = 95f + rng.Next(0, 60);
        }

        private void LoadCustomBackground()
        {
            using (OpenFileDialog dlg = new OpenFileDialog())
            {
                dlg.Title = "Выберите зимнюю картинку (16:9)";
                dlg.Filter = "Изображения|*.png;*.jpg;*.jpeg;*.bmp";
                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    try { customBg = Image.FromFile(dlg.FileName); showScenicHouse = true; TransparencyKey = Color.Empty; } catch { }
                }
            }
        }

        private Snowflake MakeFlake(bool randomY)
        {
            return new Snowflake
            {
                X = (float)(rng.NextDouble() * Width),
                Y = randomY ? (float)(rng.NextDouble() * Height) : -10f,
                Vx = (float)(rng.NextDouble() - 0.5) * 28f,
                Vy = 38f + (float)rng.NextDouble() * 65f,
                Size = 2.2f + (float)rng.NextDouble() * 4.5f,
                Phase = (float)(rng.NextDouble() * 6.28)
            };
        }

        private void OnCanvasMouseDown(object sender, MouseEventArgs e)
        {
            for (int i = ornaments.Count - 1; i >= 0; i--)
            {
                var o = ornaments[i];
                if (Math.Abs(e.X - o.X) < 18 && Math.Abs(e.Y - o.Y) < 18)
                {
                    draggedOrnament = o;
                    o.Dragging = true;
                    return;
                }
            }
            for (int i = snowmen.Count - 1; i >= 0; i--)
            {
                var sm = snowmen[i];
                if (Math.Abs(e.X - sm.X) < 38 * sm.Scale && e.Y >= sm.Y - 95 * sm.Scale && e.Y <= sm.Y + 12)
                {
                    if (e.Button == MouseButtons.Right)
                    {
                        sm.HatStyle = (sm.HatStyle + 1) % 2;
                        sm.ScarfColor = (sm.ScarfColor + 1) % 3;
                    }
                    draggedSnowman = sm;
                    sm.Dragging = true;
                    return;
                }
            }
        }

        private void OnCanvasMouseUp(object sender, MouseEventArgs e)
        {
            if (draggedSnowman != null) { draggedSnowman.Dragging = false; draggedSnowman = null; }
            if (draggedOrnament != null) { draggedOrnament.Dragging = false; draggedOrnament = null; }
        }

        private void OnCanvasMouseMove(object sender, MouseEventArgs e)
        {
            if (draggedOrnament != null)
            {
                draggedOrnament.X = e.X;
                draggedOrnament.Y = e.Y;
            }
            else if (draggedSnowman != null)
            {
                draggedSnowman.X = e.X;
                draggedSnowman.Y = Math.Min(Height - 42f, Math.Max(120f, e.Y));
            }

            // Scatter snow on taskbar / bottom panel when cursor moves over snowbank!
            float dx = e.X - lastMouse.X;
            float dy = e.Y - lastMouse.Y;
            float speed = (float)Math.Sqrt(dx * dx + dy * dy);
            lastMouse = e.Location;

            int col = (int)((e.X / (float)Math.Max(1, Width)) * bankCols);
            if (col >= 0 && col < bankCols && e.Y >= Height - 95 - snowBank[col])
            {
                for (int c = Math.Max(0, col - 4); c <= Math.Min(bankCols - 1, col + 4); c++)
                {
                    floatcut = Math.Max(0f, 5.5f - Math.Abs(c - col) * 1.1f);
                    if (snowBank[c] > 4f)
                        snowBank[c] = Math.Max(4f, snowBank[c] - floatcut * 0.45f);
                }
                int count = Math.Min(12, 3 + (int)(speed * 0.25f));
                for (int k = 0; k < count; k++)
                {
                    spray.Add(new SparkParticle
                    {
                        X = e.X + rng.Next(-12, 13),
                        Y = Math.Min(Height - 44f, e.Y + rng.Next(-6, 6)),
                        Vx = dx * 0.25f + (float)(rng.NextDouble() - 0.5) * 95f,
                        Vy = -40f - (float)rng.NextDouble() * 90f,
                        Size = 3f + (float)rng.NextDouble() * 4f,
                        Alpha = 1f,
                        Col = Color.White
                    });
                }
            }
        }

        private float floatcut;

        private void StepSimulation(float dt)
        {
            timeSec += dt;

            // Falling snow
            for (int i = 0; i < flakes.Count; i++)
            {
                var f = flakes[i];
                f.Y += f.Vy * dt;
                f.X += (f.Vx + (float)Math.Sin(timeSec * 1.6f + f.Phase) * 18f) * dt;
                if (f.X < 0) f.X += Width;
                if (f.X >= Width) f.X -= Width;

                int col = (int)((f.X / Math.Max(1f, Width)) * bankCols);
                float groundY = Height - 44f - (col >= 0 && col < bankCols ? snowBank[col] : 16f);
                if (f.Y >= groundY)
                {
                    if (col >= 0 && col < bankCols && snowBank[col] < 52f)
                        snowBank[col] += 0.22f;
                    flakes[i] = MakeFlake(false);
                }
            }

            // Smooth snowbank slightly
            for (int i = 1; i < bankCols - 1; i++)
                snowBank[i] = snowBank[i] * 0.992f + (snowBank[i - 1] + snowBank[i + 1]) * 0.004f;

            // Chimney smoke from chalet roof
            float chimneyX = Width * 0.605f;
            float chimneyY = Height * 0.305f;
            if (rng.NextDouble() < 0.35)
            {
                smoke.Add(new SmokePuff
                {
                    X = chimneyX + rng.Next(-4, 5),
                    Y = chimneyY,
                    Vx = 12f + (float)rng.NextDouble() * 14f,
                    Vy = -26f - (float)rng.NextDouble() * 16f,
                    Radius = 8f,
                    Alpha = 0.55f
                });
            }
            for (int i = smoke.Count - 1; i >= 0; i--)
            {
                var p = smoke[i];
                p.X += (p.Vx + (float)Math.Sin(timeSec * 2f + i) * 8f) * dt;
                p.Y += p.Vy * dt;
                p.Radius += 11f * dt;
                p.Alpha -= 0.14f * dt;
                if (p.Alpha <= 0.02f) smoke.RemoveAt(i);
            }

            // Santa sleigh across the sky
            if (santaActive)
            {
                santaX += 115f * santaDir * dt;
                santaY += (float)Math.Sin(timeSec * 2.3f) * 14f * dt;
                if (rng.NextDouble() < 0.65)
                {
                    spray.Add(new SparkParticle
                    {
                        X = santaX + 20f,
                        Y = santaY + 18f,
                        Vx = -30f * santaDir + rng.Next(-15, 16),
                        Vy = rng.Next(-10, 20),
                        Size = 3.5f,
                        Alpha = 0.95f,
                        Col = Color.FromArgb(255, 224, 130)
                    });
                }
                if (santaX > Width + 320f)
                {
                    santaX = -280f;
                    santaY = 85f + rng.Next(0, 75);
                }
            }

            // Tractor snowplow along the taskbar
            if (tractorActive)
            {
                tractorX += 78f * tractorDir * dt;
                int tCol = (int)((tractorX / Math.Max(1f, Width)) * bankCols);
                for (int c = Math.Max(0, tCol - 3); c <= Math.Min(bankCols - 1, tCol + 3); c++)
                {
                    if (snowBank[c] > 8f)
                    {
                        floatremoved = snowBank[c] - 8f;
                        snowBank[c] = 8f;
                        int ahead = Math.Min(bankCols - 1, Math.Max(0, c + (tractorDir > 0 ? 5 : -5)));
                        snowBank[ahead] = Math.Min(56f, snowBank[ahead] + floatremoved * 0.35f);
                        if (rng.NextDouble() < 0.45)
                        {
                            spray.Add(new SparkParticle
                            {
                                X = tractorX + tractorDir * 34f,
                                Y = Height - 54f,
                                Vx = tractorDir * (55f + rng.Next(0, 50)),
                                Vy = -45f - rng.Next(0, 55),
                                Size = 3.5f,
                                Alpha = 0.9f,
                                Col = Color.FromArgb(235, 245, 255)
                            });
                        }
                    }
                }
                if (tractorX > Width - 90f) tractorDir = -1f;
                if (tractorX < 90f) tractorDir = 1f;
            }

            // Update snow spray & sparkles
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

        private float floatremoved;

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            if (showScenicHouse)
            {
                if (customBg != null)
                {
                    g.DrawImage(customBg, 0, 0, Width, Height);
                }
                else
                {
                    DrawWinterSkyAndMountains(g);
                    DrawPineTrees(g);
                    DrawCozyChaletHouse(g);
                }
            }

            // Chimney smoke
            foreach (var p in smoke)
            {
                int a = Math.Max(0, Math.Min(255, (int)(p.Alpha * 180)));
                using (SolidBrush sb = new SolidBrush(Color.FromArgb(a, 215, 225, 240)))
                    g.FillEllipse(sb, p.X - p.Radius, p.Y - p.Radius, p.Radius * 2, p.Radius * 2);
            }

            // Santa sleigh
            if (santaActive)
                DrawSantaSleigh(g, santaX, santaY);

            // Draggable ornaments / garlands
            foreach (var o in ornaments)
                DrawOrnament(g, o);

            // Snowmen
            foreach (var sm in snowmen)
                DrawSnowman(g, sm);

            // Snowbank on bottom taskbar
            DrawSnowbank(g);

            // Snowplow tractor
            if (tractorActive)
                DrawTractor(g, tractorX, Height - 48f, tractorDir);

            // Spray & sparkles
            foreach (var sp in spray)
            {
                int a = Math.Max(0, Math.Min(255, (int)(sp.Alpha * 255)));
                using (SolidBrush b = new SolidBrush(Color.FromArgb(a, sp.Col)))
                    g.FillEllipse(b, sp.X - sp.Size * 0.5f, sp.Y - sp.Size * 0.5f, sp.Size, sp.Size);
            }

            // Falling snowflakes
            using (SolidBrush fb = new SolidBrush(Color.FromArgb(225, 255, 255, 255)))
            {
                foreach (var f in flakes)
                    g.FillEllipse(fb, f.X, f.Y, f.Size, f.Size);
            }
        }

        private void DrawWinterSkyAndMountains(Graphics g)
        {
            using (LinearGradientBrush sky = new LinearGradientBrush(new Rectangle(0, 0, Width, Height),
                Color.FromArgb(8, 14, 30), Color.FromArgb(22, 38, 68), LinearGradientMode.Vertical))
            {
                g.FillRectangle(sky, 0, 0, Width, Height);
            }
            // Crescent moonglow
            using (SolidBrush moon = new SolidBrush(Color.FromArgb(245, 252, 232, 185)))
                g.FillEllipse(moon, Width * 0.82f, 76f, 54f, 54f);
            using (SolidBrush cut = new SolidBrush(Color.FromArgb(12, 20, 40)))
                g.FillEllipse(cut, Width * 0.82f + 14f, 70f, 50f, 50f);

            // Distant snowy mountains
            PointF[] mtn = new PointF[]
            {
                new PointF(0, Height - 150),
                new PointF(Width * 0.18f, Height - 340),
                new PointF(Width * 0.35f, Height - 210),
                new PointF(Width * 0.55f, Height - 380),
                new PointF(Width * 0.76f, Height - 220),
                new PointF(Width * 0.92f, Height - 330),
                new PointF(Width, Height - 180),
                new PointF(Width, Height),
                new PointF(0, Height)
            };
            using (SolidBrush mb = new SolidBrush(Color.FromArgb(28, 45, 76)))
                g.FillPolygon(mb, mtn);
        }

        private void DrawPineTrees(Graphics g)
        {
            float[] xs = new float[] { Width * 0.08f, Width * 0.14f, Width * 0.21f, Width * 0.79f, Width * 0.86f, Width * 0.92f };
            float[] hs = new float[] { 220f, 265f, 195f, 210f, 270f, 225f };
            for (int i = 0; i < xs.Length; i++)
            {
                float cx = xs[i], baseY = Height - 48f, h = hs[i];
                for (int layer = 0; layer < 4; layer++)
                {
                    float ly = baseY - layer * (h * 0.22f);
                    float lw = (4 - layer) * 26f + 22f;
                    PointF[] tri = new PointF[]
                    {
                        new PointF(cx, ly - h * 0.34f),
                        new PointF(cx - lw, ly),
                        new PointF(cx + lw, ly)
                    };
                    using (SolidBrush tb = new SolidBrush(Color.FromArgb(18 + layer * 4, 58 + layer * 10, 48 + layer * 6)))
                        g.FillPolygon(tb, tri);
                    // Snow cap on branches
                    using (Pen sp = new Pen(Color.FromArgb(210, 235, 245, 255), 4f))
                        g.DrawLine(sp, cx - lw * 0.85f, ly - 3f, cx + lw * 0.85f, ly - 3f);
                }
            }
        }

        private void DrawCozyChaletHouse(Graphics g)
        {
            float hx = Width * 0.38f, hy = Height - 255f, hw = Width * 0.24f, hh = 205f;

            // Stone chimney
            float chX = hx + hw * 0.66f, chY = hy - 78f;
            using (SolidBrush chB = new SolidBrush(Color.FromArgb(72, 66, 64)))
                g.FillRectangle(chB, chX, chY, 34f, 68f);
            using (SolidBrush snowCap = new SolidBrush(Color.FromArgb(240, 248, 255)))
                g.FillEllipse(snowCap, chX - 4f, chY - 6f, 42f, 14f);

            // Wooden cabin walls
            using (SolidBrush wall = new SolidBrush(Color.FromArgb(78, 46, 28)))
                g.FillRectangle(wall, hx, hy, hw, hh);

            // Roof with deep snow overhang
            PointF[] roof = new PointF[]
            {
                new PointF(hx - 28f, hy + 10f),
                new PointF(hx + hw * 0.5f, hy - 95f),
                new PointF(hx + hw + 28f, hy + 10f)
            };
            using (SolidBrush rb = new SolidBrush(Color.FromArgb(52, 32, 22)))
                g.FillPolygon(rb, roof);
            using (Pen snowRoof = new Pen(Color.FromArgb(242, 248, 255), 12f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
                g.DrawLines(snowRoof, roof);

            // Warm glowing windows
            RectangleF[] wins = new RectangleF[]
            {
                new RectangleF(hx + 28f, hy + 42f, 56f, 52f),
                new RectangleF(hx + hw - 84f, hy + 42f, 56f, 52f),
                new RectangleF(hx + hw * 0.5f - 24f, hy - 36f, 48f, 40f)
            };
            foreach (var w in wins)
            {
                using (SolidBrush glow = new SolidBrush(Color.FromArgb(70, 255, 200, 95)))
                    g.FillEllipse(glow, w.X - 14f, w.Y - 14f, w.Width + 28f, w.Height + 28f);
                using (SolidBrush wb = new SolidBrush(Color.FromArgb(255, 214, 120)))
                    g.FillRectangle(wb, w.X, w.Y, w.Width, w.Height);
                using (Pen pane = new Pen(Color.FromArgb(90, 52, 28), 3f))
                {
                    g.DrawRectangle(pane, w.X, w.Y, w.Width, w.Height);
                    g.DrawLine(pane, w.X + w.Width / 2f, w.Y, w.X + w.Width / 2f, w.Y + w.Height);
                    g.DrawLine(pane, w.X, w.Y + w.Height / 2f, w.X + w.Width, w.Y + w.Height / 2f);
                }
            }

            // Cozy wooden door with wreath
            float dx = hx + hw * 0.5f - 22f, dy = hy + hh - 86f;
            using (SolidBrush db = new SolidBrush(Color.FromArgb(58, 30, 18)))
                g.FillRectangle(db, dx, dy, 44f, 86f);
            using (Pen wreath = new Pen(Color.FromArgb(34, 139, 68), 6f))
                g.DrawEllipse(wreath, dx + 10f, dy + 16f, 24f, 24f);

            // Twinkling Christmas garlands along roof eaves!
            Color[] bulbCols = new Color[]
            {
                Color.FromArgb(255, 215, 90),
                Color.FromArgb(255, 85, 85),
                Color.FromArgb(90, 235, 145),
                Color.FromArgb(110, 195, 255)
            };
            int bulbs = 22;
            for (int i = 0; i <= bulbs; i++)
            {
                float t = i / (float)bulbs;
                float bx = (hx - 22f) + t * (hw + 44f);
                float by = (t <= 0.5f)
                    ? (hy + 10f) - (t * 2f) * 102f
                    : (hy - 92f) + ((t - 0.5f) * 2f) * 102f;
                float pulse = 0.55f + 0.45f * (float)Math.Sin(timeSec * 5.2f + i * 0.9f);
                Color c = bulbCols[i % bulbCols.Length];
                using (SolidBrush halo = new SolidBrush(Color.FromArgb((int)(pulse * 110), c)))
                    g.FillEllipse(halo, bx - 9f, by - 9f, 18f, 18f);
                using (SolidBrush core = new SolidBrush(Color.FromArgb((int)(160 + pulse * 95), c)))
                    g.FillEllipse(core, bx - 4f, by - 4f, 8f, 8f);
            }
        }

        private void DrawSantaSleigh(Graphics g, float x, float y)
        {
            // Sleigh body
            using (SolidBrush red = new SolidBrush(Color.FromArgb(210, 38, 48)))
                g.FillPolygon(red, new PointF[] {
                    new PointF(x, y + 10), new PointF(x + 56, y + 10),
                    new PointF(x + 68, y + 28), new PointF(x - 8, y + 28)
                });
            using (Pen runner = new Pen(Color.FromArgb(245, 208, 125), 3f))
            {
                g.DrawLine(runner, x - 12, y + 32, x + 74, y + 32);
                // Harness line to reindeer
                g.DrawLine(runner, x + 64, y + 18, x + 155, y + 14);
            }
            // Santa hat & head
            using (SolidBrush face = new SolidBrush(Color.FromArgb(255, 224, 196)))
                g.FillEllipse(face, x + 22, y - 6, 16, 16);
            using (SolidBrush beard = new SolidBrush(Color.White))
                g.FillEllipse(beard, x + 24, y + 3, 16, 12);
            using (SolidBrush hat = new SolidBrush(Color.FromArgb(220, 38, 38)))
                g.FillPolygon(hat, new PointF[] { new PointF(x + 20, y - 3), new PointF(x + 38, y - 3), new PointF(x + 26, y - 16) });

            // Two leaping reindeer ahead of sleigh
            for (int r = 0; r < 2; r++)
            {
                float rx = x + 95 + r * 48;
                float ry = y + 6 + (float)Math.Sin(timeSec * 8f + r) * 4f;
                using (SolidBrush deer = new SolidBrush(Color.FromArgb(148, 96, 56)))
                {
                    g.FillEllipse(deer, rx, ry + 4, 28, 13);
                    g.FillEllipse(deer, rx + 22, ry - 3, 12, 10);
                }
                if (r == 1)
                {
                    using (SolidBrush rudolph = new SolidBrush(Color.FromArgb(255, 60, 60)))
                        g.FillEllipse(rudolph, rx + 33, ry - 1, 6, 6);
                }
            }
        }

        private void DrawSnowman(Graphics g, SnowmanItem sm)
        {
            float s = sm.Scale;
            float x = sm.X, y = sm.Y;
            using (SolidBrush snow = new SolidBrush(Color.FromArgb(246, 250, 255)))
            using (Pen rim = new Pen(Color.FromArgb(180, 205, 230), 1.5f))
            {
                // Bottom, middle, head snowballs
                RectangleF b1 = new RectangleF(x - 28 * s, y - 42 * s, 56 * s, 48 * s);
                RectangleF b2 = new RectangleF(x - 21 * s, y - 74 * s, 42 * s, 38 * s);
                RectangleF b3 = new RectangleF(x - 15 * s, y - 98 * s, 30 * s, 28 * s);
                g.FillEllipse(snow, b1); g.DrawEllipse(rim, b1.X, b1.Y, b1.Width, b1.Height);
                g.FillEllipse(snow, b2); g.DrawEllipse(rim, b2.X, b2.Y, b2.Width, b2.Height);
                g.FillEllipse(snow, b3); g.DrawEllipse(rim, b3.X, b3.Y, b3.Width, b3.Height);
            }
            // Twig arms
            using (Pen arm = new Pen(Color.FromArgb(105, 68, 42), 2.5f))
            {
                g.DrawLine(arm, x - 19 * s, y - 58 * s, x - 42 * s, y - 72 * s);
                g.DrawLine(arm, x + 19 * s, y - 58 * s, x + 42 * s, y - 70 * s);
            }
            // Eyes & buttons
            using (SolidBrush coal = new SolidBrush(Color.FromArgb(30, 35, 45)))
            {
                g.FillEllipse(coal, x - 6 * s, y - 89 * s, 4 * s, 4 * s);
                g.FillEllipse(coal, x + 3 * s, y - 89 * s, 4 * s, 4 * s);
                g.FillEllipse(coal, x - 2 * s, y - 62 * s, 4.5f * s, 4.5f * s);
                g.FillEllipse(coal, x - 2 * s, y - 51 * s, 4.5f * s, 4.5f * s);
            }
            // Carrot nose
            using (SolidBrush carrot = new SolidBrush(Color.FromArgb(249, 115, 22)))
                g.FillPolygon(carrot, new PointF[] {
                    new PointF(x, y - 84 * s),
                    new PointF(x + 15 * s, y - 81 * s),
                    new PointF(x, y - 79 * s)
                });
            // Scarf
            Color[] scarfCols = new Color[] { Color.FromArgb(220, 38, 38), Color.FromArgb(16, 185, 129), Color.FromArgb(234, 179, 8) };
            using (SolidBrush sc = new SolidBrush(scarfCols[sm.ScarfColor % scarfCols.Length]))
            {
                g.FillRectangle(sc, x - 15 * s, y - 74 * s, 30 * s, 7 * s);
                g.FillRectangle(sc, x + 5 * s, y - 72 * s, 6 * s, 18 * s);
            }
            // Hat (Top hat or Santa hat)
            if (sm.HatStyle == 0)
            {
                using (SolidBrush hat = new SolidBrush(Color.FromArgb(24, 28, 38)))
                {
                    g.FillRectangle(hat, x - 18 * s, y - 100 * s, 36 * s, 5 * s);
                    g.FillRectangle(hat, x - 12 * s, y - 120 * s, 24 * s, 21 * s);
                }
            }
            else
            {
                using (SolidBrush red = new SolidBrush(Color.FromArgb(220, 38, 38)))
                    g.FillPolygon(red, new PointF[] {
                        new PointF(x - 15 * s, y - 96 * s),
                        new PointF(x + 15 * s, y - 96 * s),
                        new PointF(x - 4 * s, y - 120 * s)
                    });
                using (SolidBrush pom = new SolidBrush(Color.White))
                    g.FillEllipse(pom, x - 8 * s, y - 124 * s, 9 * s, 9 * s);
            }
        }

        private void DrawOrnament(Graphics g, OrnamentItem o)
        {
            Color[] cols = new Color[]
            {
                Color.FromArgb(239, 68, 68),
                Color.FromArgb(245, 196, 81),
                Color.FromArgb(52, 211, 153),
                Color.FromArgb(96, 165, 250)
            };
            Color c = cols[o.Kind % cols.Length];
            float pulse = 0.6f + 0.4f * (float)Math.Sin(timeSec * 4.2f + o.Phase);
            using (SolidBrush glow = new SolidBrush(Color.FromArgb((int)(pulse * 120), c)))
                g.FillEllipse(glow, o.X - 15f, o.Y - 15f, 30f, 30f);
            using (SolidBrush ball = new SolidBrush(c))
                g.FillEllipse(ball, o.X - 8f, o.Y - 8f, 16f, 16f);
            using (SolidBrush shine = new SolidBrush(Color.FromArgb(190, 255, 255, 255)))
                g.FillEllipse(shine, o.X - 5f, o.Y - 5f, 5f, 5f);
        }

        private void DrawSnowbank(Graphics g)
        {
            PointF[] poly = new PointF[bankCols + 2];
            for (int i = 0; i < bankCols; i++)
            {
                float x = (i / (float)(bankCols - 1)) * Width;
                poly[i] = new PointF(x, Height - 40f - snowBank[i]);
            }
            poly[bankCols] = new PointF(Width, Height);
            poly[bankCols + 1] = new PointF(0, Height);

            using (LinearGradientBrush sb = new LinearGradientBrush(
                new Rectangle(0, Height - 110, Width, 110),
                Color.FromArgb(248, 252, 255),
                Color.FromArgb(200, 220, 245),
                LinearGradientMode.Vertical))
            {
                g.FillPolygon(sb, poly);
            }
        }

        private void DrawTractor(Graphics g, float x, float y, float dir)
        {
            GraphicsState st = g.Save();
            g.TranslateTransform(x, y);
            if (dir < 0) g.ScaleTransform(-1f, 1f);

            // Headlight beam
            PointF[] beam = new PointF[] { new PointF(30, -14), new PointF(125, -36), new PointF(125, 6) };
            using (SolidBrush hb = new SolidBrush(Color.FromArgb(55, 255, 235, 150)))
                g.FillPolygon(hb, beam);

            // Tractor cabin & body
            using (SolidBrush body = new SolidBrush(Color.FromArgb(234, 179, 8)))
            {
                g.FillRectangle(body, -26, -26, 44, 20);
                g.FillRectangle(body, -18, -44, 24, 20);
            }
            using (SolidBrush win = new SolidBrush(Color.FromArgb(186, 230, 253)))
                g.FillRectangle(win, -14, -41, 16, 13);

            // Snowplow blade in front
            using (SolidBrush blade = new SolidBrush(Color.FromArgb(220, 38, 38)))
                g.FillPolygon(blade, new PointF[] { new PointF(22, -24), new PointF(34, -28), new PointF(38, 2), new PointF(22, 0) });

            // Wheels
            using (SolidBrush tire = new SolidBrush(Color.FromArgb(30, 34, 42)))
            {
                g.FillEllipse(tire, -28, -14, 20, 20);
                g.FillEllipse(tire, 4, -10, 16, 16);
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
