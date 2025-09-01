/* =========================================================
   Projeto Integrador – ViaCEP + LocalStorage + Login
   ---------------------------------------------------------
   • Cadastro de usuário
   • Autopreenchimento de endereço com ViaCEP
   • CRUD usando localStorage
   • Login validando e-mail e senha
   • Exibição de informações após login
   ========================================================= */

// ---------- Util localStorage ----------
const KEY = "pi_usuarios";       // onde guardamos os usuários
const KEY_LOGGED = "pi_usuario_logado";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}
function saveUsers(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// ---------- Navegação simples por abas ----------
const tabBtns = document.querySelectorAll(".tab-btn");
const tabs = document.querySelectorAll(".tab");
tabBtns.forEach(btn => btn.addEventListener("click", () => openTab(btn.dataset.tab)));
function openTab(id) {
  tabs.forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
openTab("cadastro"); // inicial

// ---------- ViaCEP ----------
const cepEl = document.getElementById("cep");
if (cepEl) {
  // máscara simples do CEP
  cepEl.addEventListener("input", () => {
    let v = cepEl.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
    cepEl.value = v;
  });

  // quando sair do campo, busca endereço
  cepEl.addEventListener("blur", async () => {
    const cep = (cepEl.value || "").replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await r.json();
      if (data.erro) return;

      document.getElementById("rua").value = data.logradouro || "";
      document.getElementById("bairro").value = data.bairro || "";
      document.getElementById("cidade").value = data.localidade || "";
      document.getElementById("uf").value = data.uf || "";
    } catch (e) {
      console.warn("Falha ao consultar ViaCEP:", e);
    }
  });
}

// ---------- Cadastro ----------
const formCadastro = document.getElementById("formCadastro");
formCadastro.addEventListener("submit", (e) => {
  e.preventDefault();

  const usuario = {
    id: crypto.randomUUID(),
    nome: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim().toLowerCase(),
    senha: document.getElementById("senha").value, // simples (ver nota no final)
    cep: document.getElementById("cep").value,
    rua: document.getElementById("rua").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    uf: document.getElementById("uf").value.toUpperCase()
  };

  const confirma = document.getElementById("confirmaSenha").value;
  if (usuario.senha !== confirma) {
    alert("As senhas não conferem.");
    return;
  }

  const users = loadUsers();
  const exist = users.some(u => u.email === usuario.email);
  if (exist) {
    alert("Já existe um usuário com este e-mail.");
    return;
  }

  users.push(usuario);
  saveUsers(users);
  renderTable();
  formCadastro.reset();
  alert("Usuário cadastrado com sucesso!");
});

// ---------- Tabela / CRUD ----------
const tbody = document.querySelector("#tabelaUsuarios tbody");

function renderTable() {
  const users = loadUsers();
  tbody.innerHTML = "";

  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.nome}</td>
      <td>${u.email}</td>
      <td>${u.cep || "-"}</td>
      <td>${u.cidade || "-"} / ${u.uf || "-"}</td>
      <td>
        <div class="row-actions">
          <button class="btn-edit" data-id="${u.id}">Editar</button>
          <button class="btn-del" data-id="${u.id}">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
renderTable();

// Delegação dos botões de ação
tbody.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("btn-del")) {
    if (confirm("Deseja realmente excluir?")) {
      const users = loadUsers().filter(u => u.id !== id);
      saveUsers(users);
      renderTable();
    }
  }

  if (e.target.classList.contains("btn-edit")) {
    const users = loadUsers();
    const u = users.find(x => x.id === id);
    if (!u) return;
    // Preenche o formulário para edição
    openTab("cadastro");
    document.getElementById("nome").value = u.nome;
    document.getElementById("email").value = u.email;
    document.getElementById("senha").value = u.senha;
    document.getElementById("confirmaSenha").value = u.senha;
    document.getElementById("cep").value = u.cep || "";
    document.getElementById("rua").value = u.rua || "";
    document.getElementById("bairro").value = u.bairro || "";
    document.getElementById("cidade").value = u.cidade || "";
    document.getElementById("uf").value = u.uf || "";

    // Ao salvar novamente, troca (update) em vez de criar
    formCadastro.onsubmit = (ev) => {
      ev.preventDefault();
      const novo = {
        ...u,
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        senha: document.getElementById("senha").value,
        cep: document.getElementById("cep").value,
        rua: document.getElementById("rua").value,
        bairro: document.getElementById("bairro").value,
        cidade: document.getElementById("cidade").value,
        uf: document.getElementById("uf").value.toUpperCase()
      };
      const confirma = document.getElementById("confirmaSenha").value;
      if (novo.senha !== confirma) return alert("As senhas não conferem.");

      const list = loadUsers();
      // valida e-mail único (exceto o próprio)
      if (list.some(x => x.email === novo.email && x.id !== u.id)) {
        return alert("Este e-mail já está em uso por outro usuário.");
      }
      const idx = list.findIndex(x => x.id === u.id);
      list[idx] = novo;
      saveUsers(list);
      renderTable();
      alert("Usuário atualizado!");
      // restaura o handler padrão
      formCadastro.onsubmit = (e2) => formCadastro.dispatchEvent(new Event("submit"));
    };
  }
});

// ---------- Login ----------
const formLogin = document.getElementById("formLogin");
const areaLogado = document.getElementById("areaLogado");
const btnSair = document.getElementById("btnSair");

function preencherAreaLogado(u) {
  document.getElementById("nomeLogado").textContent = u.nome;
  document.getElementById("emailLogado").textContent = u.email;
  const end = [u.rua, u.bairro, u.cidade && `${u.cidade}/${u.uf}`, u.cep]
    .filter(Boolean).join(" – ");
  document.getElementById("enderecoLogado").textContent = end || "—";
  areaLogado.classList.remove("hidden");
  btnSair.classList.remove("hidden");
}

function checkSessao() {
  const u = JSON.parse(localStorage.getItem(KEY_LOGGED) || "null");
  if (u) preencherAreaLogado(u);
}
checkSessao();

formLogin.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const senha = document.getElementById("loginSenha").value;

  const users = loadUsers();
  const user = users.find(u => u.email === email && u.senha === senha);

  if (!user) {
    alert("E-mail ou senha inválidos.");
    return;
  }
  localStorage.setItem(KEY_LOGGED, JSON.stringify(user));
  preencherAreaLogado(user);
  alert("Login realizado!");
});

btnSair.addEventListener("click", () => {
  localStorage.removeItem(KEY_LOGGED);
  areaLogado.classList.add("hidden");
  btnSair.classList.add("hidden");
  alert("Sessão encerrada.");
});
