BUGS DA NOVA VERSÃO

o hover com score so atualiza o valor se eu atualizar a tela, se eu edito o valor, salvo, fecho o modal, o hover mostra o score que tava antes da edição.

Os botãoes de próximo e anterior de dentro do modal ficaram horríveis, não tem nada a ver com o design do site, e estão muito pequenos, dificultando clicar neles pq cada modal fica de um tamanho, ai clico o modal redimenciona, o topo do modal deveria estar sempre na mesma altura.

tem hora que o click no teclado não funciona para avançar ou recuar.

quando chega no final daquela página, e avanço ele fecha o modal recarregando a página, deveria abrir o próximo modal da próxima página, ou seja, o próximo livro da lista, sem recarregar a página.

eu nao consigo desmarcar os filtros selecionados de Leitura, linguagem, jogado, solo friendly

o console do navegador está com esse erro
Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.

pq o filtro de FOLDER, LEITURA, JOGADO não é colapsável? 


----
eu clico no score para desmarcar, ele desmarca, mas se eu clico em salvar, ele não salva mudança para vazio, voltando ao que tava

A parte que mostra o path ta bem ruim, nao fala se veio da pasta EN ou PT, e ta de um jeito bem paia de ver

não ta obvio a diferença de cores nas tags, nao gostei das cores usadas.

considerando os filtros aplicados, ter um botão pra selecionar algum livro aleatoriamente e abrir o modal dele, adicione esse botao dentro do modal também

o botão de resetar filtro está mega escondido.

crie um plano de execução dessas melhorias para nao se perder

Troque o tema em vez de verde para marrom, pra lembrar estetante de livros, o fundo inclusive do site pode ser levemente bege também

NÃO QUEBRE A RESPONSIVIDADE

TEM QUE ESTÁ VISÍVEL A VERSÃO DO BACKEND E DO FRONTEND EM ALGUM LUGAR DO SITE, PODE SER NO RODAPÉ, PARA FACILITAR O DEBUG E A COMUNICAÇÃO ENTRE OS DEVs.

-----
SOBRE DEPLOY EU TIVE QUE FAZER ISSO

# Puxa as imagens novas do GHCR
docker pull ghcr.io/sergiosjs/catalogo-livros/catalog:latest
docker pull ghcr.io/sergiosjs/catalogo-livros/indexer:latest

# Para e remove os containers atuais
docker stop rpg-catalog rpg-indexer
docker rm rpg-catalog rpg-indexer

cd /DATA/AppData/catalogo-livros
docker compose pull
docker compose up -d --force-recreate


PRECISO FAZER ISSO TODA VEZ QUE QUISER ATUALIZAR? NÃO TEM JEITO MELHOR?