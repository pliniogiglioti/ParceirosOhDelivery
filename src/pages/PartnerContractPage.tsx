import { type UIEvent, useState } from 'react'
import { FileSignature, Loader2, LogOut, ScrollText, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { saveStore } from '@/services/partner'
import type { PartnerDashboardData } from '@/types'

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

type ContractSection = {
  title: string
  paragraphs: string[]
  items?: string[]
  trailing?: string[]
}

const CONTRACT_SECTIONS: ContractSection[] = [
  {
    title: 'CLAUSULA 1 - DO OBJETO',
    paragraphs: [
      '1.1. O presente contrato tem por objeto a prestacao, pela CONTRATADA, de servicos de disponibilizacao, manutencao e operacao da plataforma digital denominada OH DELIVERY, destinada a divulgacao de produtos, recebimento de pedidos, intermediacao digital entre consumidores e estabelecimentos parceiros, gestao operacional de cardapio, atendimento e demais funcionalidades disponibilizadas no sistema.',
      '1.2. Tambem constitui objeto deste contrato o licenciamento de uso, em carater oneroso, nao exclusivo, intransferivel e revogavel, da plataforma OH DELIVERY ao CONTRATANTE, enquanto vigente esta contratacao.',
      '1.3. A CONTRATADA podera disponibilizar ao CONTRATANTE funcionalidades como:',
    ],
    items: [
      'a) cadastro e gestao de cardapio;',
      'b) recebimento de pedidos por aplicativo, painel web ou sistema integrado;',
      'c) disponibilizacao de area administrativa;',
      'd) gestao de status dos pedidos;',
      'e) divulgacao do estabelecimento dentro da plataforma;',
      'f) integracao com meios de pagamento, quando aplicavel;',
      'g) ferramentas promocionais, quando contratadas ou liberadas pela plataforma.',
    ],
  },
  {
    title: 'CLAUSULA 2 - DA NATUREZA DA RELACAO',
    paragraphs: [
      '2.1. A CONTRATADA atua como plataforma tecnologica e intermediadora digital, nao se responsabilizando pela fabricacao, preparo, qualidade, quantidade, temperatura, acondicionamento, prazo de validade, entrega final realizada por terceiros, ou qualquer obrigacao sanitaria, fiscal, trabalhista ou consumerista diretamente relacionada aos produtos comercializados pelo CONTRATANTE.',
      '2.2. Nao ha, entre as partes, qualquer vinculo societario, trabalhista, associativo, de representacao comercial exclusiva ou de franquia, permanecendo ambas independentes entre si.',
    ],
  },
  {
    title: 'CLAUSULA 3 - DO CADASTRO E DAS INFORMACOES DO CONTRATANTE',
    paragraphs: [
      '3.1. O CONTRATANTE declara que todas as informacoes fornecidas no momento do cadastro sao verdadeiras, completas e atualizadas, responsabilizando-se civil e criminalmente por sua exatidao.',
      '3.2. O CONTRATANTE obriga-se a manter atualizados seus dados cadastrais, cardapio, precos, disponibilidade de produtos, horarios de funcionamento, dados bancarios, dados fiscais e demais informacoes relevantes ao correto funcionamento da plataforma.',
      '3.3. O CONTRATANTE e o unico responsavel pelas credenciais de acesso ao painel da plataforma, devendo manter sigilo sobre login e senha, respondendo por todo uso realizado com sua conta.',
    ],
  },
  {
    title: 'CLAUSULA 4 - DA DISPONIBILIZACAO DA PLATAFORMA',
    paragraphs: [
      '4.1. A CONTRATADA envidara esforcos para manter a plataforma em funcionamento regular, podendo, no entanto, ocorrer indisponibilidades temporarias para manutencao, atualizacao, correcao, falhas tecnicas, caso fortuito, forca maior ou problemas de terceiros.',
      '4.2. A CONTRATADA podera, a seu criterio, alterar layout, funcionalidades, fluxos de uso, regras operacionais e ferramentas da plataforma, desde que tais mudancas nao inviabilizem a essencia do servico contratado.',
    ],
  },
  {
    title: 'CLAUSULA 5 - DAS OBRIGACOES DA CONTRATADA',
    paragraphs: ['5.1. Constituem obrigacoes da CONTRATADA:'],
    items: [
      'a) disponibilizar ao CONTRATANTE acesso a plataforma OH DELIVERY durante a vigencia contratual;',
      'b) fornecer ambiente digital para recebimento e gestao de pedidos;',
      'c) realizar manutencao tecnica evolutiva e corretiva da plataforma, conforme sua politica interna;',
      'd) repassar ao CONTRATANTE os valores que lhe forem devidos, descontadas as taxas, comissoes, estornos, cancelamentos e demais encargos previstos neste contrato;',
      'e) adotar medidas razoaveis de seguranca compativeis com a operacao da plataforma.',
    ],
  },
  {
    title: 'CLAUSULA 6 - DAS OBRIGACOES DO CONTRATANTE',
    paragraphs: ['6.1. Constituem obrigacoes do CONTRATANTE:'],
    items: [
      'a) manter regularidade fiscal, sanitaria, comercial e cadastral de sua operacao;',
      'b) cadastrar corretamente os produtos, precos, descricoes, imagens, adicionais e promocoes;',
      'c) honrar integralmente os pedidos confirmados na plataforma, salvo indisponibilidade real e devidamente justificada;',
      'd) preparar, acondicionar e disponibilizar os produtos dentro dos padroes legais e sanitarios aplicaveis;',
      'e) prestar atendimento adequado ao consumidor final;',
      'f) emitir documentos fiscais quando exigidos pela legislacao;',
      'g) responder por reclamacoes decorrentes dos produtos, atendimento, estoque, qualidade, prazo de preparo e demais aspectos de sua operacao;',
      'h) nao utilizar a plataforma para comercializacao de produtos ilicitos, proibidos, vencidos, adulterados ou em desacordo com a legislacao;',
      'i) manter conta bancaria valida para recebimento dos repasses;',
      'j) comunicar imediatamente qualquer uso indevido de sua conta ou suspeita de fraude.',
    ],
  },
  {
    title: 'CLAUSULA 7 - DOS PEDIDOS E DA OPERACAO',
    paragraphs: [
      '7.1. Os pedidos realizados por consumidores por meio da plataforma serao encaminhados ao CONTRATANTE, que sera responsavel por aceita-los, recusa-los justificadamente quando cabivel e executa-los dentro do prazo informado.',
      '7.2. O CONTRATANTE reconhece que cancelamentos excessivos, atrasos recorrentes, divergencia de produtos, ma qualidade, descumprimento de oferta ou atendimento inadequado poderao gerar advertencia, suspensao temporaria ou rescisao contratual.',
      '7.3. Quando houver entrega realizada pelo proprio CONTRATANTE ou por terceiro vinculado a ele, toda a responsabilidade operacional da entrega sera do CONTRATANTE, salvo contratacao expressa em sentido diverso.',
    ],
  },
  {
    title: 'CLAUSULA 8 - DOS VALORES, TAXAS E REPASSES',
    paragraphs: [
      '8.1. Pela utilizacao da plataforma, o CONTRATANTE pagara a CONTRATADA comissao de 5% (cinco por cento) sobre cada pedido concluido na plataforma.',
      '8.2. Os valores recebidos pela plataforma, quando processados pela CONTRATADA ou por meio de parceiro de pagamento integrado, serao repassados ao CONTRATANTE no prazo de [prazo definido pela operacao] dias uteis, descontados:',
    ],
    items: [
      'a) a comissao de 5% (cinco por cento) da plataforma;',
      'b) taxas de meios de pagamento, quando houver;',
      'c) estornos, chargebacks, reembolsos e cancelamentos;',
      'd) multas, indenizacoes ou compensacoes previstas neste contrato;',
      'e) tributos ou retencoes legalmente exigidos, se aplicaveis.',
    ],
    trailing: [
      '8.3. A CONTRATADA podera reter temporariamente valores quando houver indicio de fraude, contestacao de pagamento, chargeback, inconsistencias cadastrais, decisao judicial, determinacao administrativa ou necessidade de apuracao operacional.',
      '8.4. Em caso de inadimplencia do CONTRATANTE relativamente a valores devidos a CONTRATADA, poderao incidir multa moratoria de 2% (dois por cento), juros de 1% (um por cento) ao mes e correcao monetaria pelo indice legal aplicavel.',
    ],
  },
  {
    title: 'CLAUSULA 9 - DOS MEIOS DE PAGAMENTO, ESTORNOS E CHARGEBACKS',
    paragraphs: [
      '9.1. Quando o pagamento do pedido ocorrer por meio eletronico dentro da plataforma, o CONTRATANTE reconhece que podera haver solicitacoes de estorno, cancelamento, chargeback ou contestacao por parte do consumidor, operadora ou instituicao financeira.',
      '9.2. Nesses casos, a CONTRATADA podera descontar tais valores dos repasses futuros ou cobrar diretamente do CONTRATANTE, caso o repasse ja tenha sido realizado.',
      '9.3. O CONTRATANTE compromete-se a fornecer, sempre que solicitado, comprovantes, evidencias de preparo, atendimento, entrega ou retirada, a fim de auxiliar na defesa de contestacoes.',
    ],
  },
  {
    title: 'CLAUSULA 10 - DA RESPONSABILIDADE PERANTE O CONSUMIDOR',
    paragraphs: [
      '10.1. O CONTRATANTE e integralmente responsavel pelos produtos e servicos que oferece ao consumidor final, inclusive quanto a qualidade, quantidade, composicao, preco, informacoes, acondicionamento, prazo de validade e cumprimento da oferta.',
      '10.2. O CONTRATANTE compromete-se a atender diretamente as reclamacoes relacionadas a sua operacao, sem prejuizo do apoio operacional que a CONTRATADA possa prestar, a seu exclusivo criterio.',
      '10.3. Caso a CONTRATADA venha a sofrer prejuizos, condenacoes, bloqueios, estornos, multas ou danos em razao de condutas imputaveis ao CONTRATANTE, este devera ressarcir integralmente a CONTRATADA.',
    ],
  },
  {
    title: 'CLAUSULA 11 - DA PROPRIEDADE INTELECTUAL E USO DE MARCA',
    paragraphs: [
      '11.1. A plataforma OH DELIVERY, seu sistema, layout, codigo, identidade visual, funcionalidades, marcas, logotipos, nome empresarial, metodos, banco de dados e demais elementos relacionados constituem propriedade exclusiva da CONTRATADA, sendo vedada sua reproducao, engenharia reversa, copia, cessao, sublicenciamento ou exploracao indevida.',
      '11.2. O CONTRATANTE autoriza a CONTRATADA, durante a vigencia do presente contrato, a utilizar seu nome comercial, marca, logotipo, imagens e materiais institucionais para fins de divulgacao dentro da plataforma, em campanhas publicitarias, redes sociais, materiais promocionais e acoes comerciais relacionadas a operacao da OH DELIVERY.',
      '11.3. O CONTRATANTE declara possuir os direitos necessarios sobre os materiais enviados a plataforma, responsabilizando-se por qualquer violacao de direitos de terceiros.',
    ],
  },
  {
    title: 'CLAUSULA 12 - DA PROTECAO DE DADOS',
    paragraphs: [
      '12.1. As partes comprometem-se a tratar os dados pessoais eventualmente envolvidos na execucao deste contrato de forma adequada, segura e em conformidade com a legislacao aplicavel.',
      '12.2. Cada parte sera responsavel pelos dados pessoais que coletar, acessar, armazenar ou tratar no ambito de sua propria atividade.',
      '12.3. O CONTRATANTE compromete-se a utilizar os dados dos consumidores apenas para fins relacionados ao processamento, preparo, entrega, atendimento e suporte dos pedidos realizados pela plataforma, sendo vedado o uso indevido, comercializacao ou compartilhamento nao autorizado dessas informacoes.',
    ],
  },
  {
    title: 'CLAUSULA 13 - DA VIGENCIA',
    paragraphs: [
      '13.1. O presente contrato entra em vigor na data do aceite eletronico realizado pelo CONTRATANTE na plataforma e tera prazo indeterminado, permanecendo valido ate que uma das partes solicite sua rescisao, na forma deste instrumento.',
    ],
  },
  {
    title: 'CLAUSULA 14 - DA RESCISAO',
    paragraphs: [
      '14.1. O presente contrato podera ser rescindido por qualquer das partes, a qualquer tempo, mediante aviso previo por escrito de 30 (trinta) dias.',
      '14.2. A CONTRATADA podera rescindir imediatamente este contrato, independentemente de aviso previo, nas seguintes hipoteses:',
    ],
    items: [
      'a) fraude ou indicio relevante de fraude;',
      'b) uso indevido da plataforma;',
      'c) descumprimento de obrigacao contratual;',
      'd) pratica de ato ilicito;',
      'e) comercializacao de produtos proibidos ou irregulares;',
      'f) reiteradas reclamacoes graves de consumidores;',
      'g) informacoes cadastrais falsas ou desatualizadas;',
      'h) determinacao judicial ou administrativa.',
    ],
    trailing: [
      '14.3. A rescisao nao prejudicara o direito de cobranca de valores pendentes, estornos, indenizacoes, multas ou qualquer obrigacao sobrevivente prevista neste contrato.',
    ],
  },
  {
    title: 'CLAUSULA 15 - DAS PENALIDADES',
    paragraphs: [
      '15.1. O descumprimento de quaisquer das obrigacoes previstas neste contrato podera sujeitar a parte infratora, sem prejuizo de perdas e danos, as seguintes penalidades:',
    ],
    items: [
      'a) advertencia;',
      'b) suspensao temporaria de acesso a plataforma;',
      'c) bloqueio de funcionalidades;',
      'd) rescisao contratual;',
      'e) cobranca de multa nao compensatoria no valor de R$ [valor aplicavel], sem prejuizo de apuracao de perdas e danos, quando aplicavel.',
    ],
  },
  {
    title: 'CLAUSULA 16 - DAS COMUNICACOES',
    paragraphs: [
      '16.1. Todas as comunicacoes entre as partes poderao ser realizadas por e-mail, painel da plataforma, aplicativo de mensagens, notificacao no sistema ou qualquer outro meio que comprove o envio.',
      '16.2. Considerar-se-ao validas as comunicacoes enviadas aos enderecos fisicos, eletronicos e contatos informados no cadastro das partes.',
    ],
  },
  {
    title: 'CLAUSULA 17 - DO ACEITE ELETRONICO E DA FORMALIZACAO',
    paragraphs: [
      '17.1. O presente contrato sera considerado formalizado e plenamente valido mediante aceite eletronico do CONTRATANTE dentro da plataforma OH DELIVERY.',
      '17.2. O aceite eletronico podera ser registrado por meio de acao inequivoca do CONTRATANTE, incluindo, mas nao se limitando, a marcacao de checkbox, clique em botao de confirmacao, autenticacao em conta vinculada, confirmacao em painel administrativo ou outro mecanismo eletronico adotado pela CONTRATADA.',
      '17.3. O registro eletronico do aceite ficara vinculado aos dados do cadastro do CONTRATANTE, bem como aos metadados internos da plataforma, incluindo data, hora, IP, identificador do usuario, identificador do estabelecimento e/ou ID interno de aceite ou assinatura registrado no sistema da CONTRATADA.',
      '17.4. As partes reconhecem a validade do aceite eletronico como manifestacao legitima de vontade, dispensando assinatura fisica, reconhecimento de firma, testemunhas ou vias impressas.',
      '17.5. Apos o aceite eletronico, o presente contrato ficara disponivel para consulta pelo CONTRATANTE na plataforma ou em ambiente digital disponibilizado pela CONTRATADA.',
    ],
  },
  {
    title: 'CLAUSULA 18 - DAS DISPOSICOES GERAIS',
    paragraphs: [
      '18.1. A eventual tolerancia de uma parte para com a outra quanto ao descumprimento de qualquer obrigacao contratual nao constituira renuncia, novacao ou alteracao contratual.',
      '18.2. Caso qualquer disposicao deste contrato seja considerada nula ou inexequivel, as demais clausulas permanecerao em pleno vigor.',
      '18.3. Eventuais anexos, propostas comerciais, politicas da plataforma, regras operacionais e termos aceitos eletronicamente poderao integrar este contrato.',
    ],
  },
  {
    title: 'CLAUSULA 19 - DO FORO',
    paragraphs: [
      '19.1. Fica eleito o foro da Comarca de Osvaldo Cruz/SP para dirimir quaisquer controversias oriundas deste contrato, com renuncia expressa a qualquer outro, por mais privilegiado que seja.',
    ],
  },
]

export function PartnerContractPage({ data }: { data: PartnerDashboardData }) {
  const navigate = useNavigate()
  const { signOut } = usePartnerAuth()
  const [signatureCpf, setSignatureCpf] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasReachedContractEnd, setHasReachedContractEnd] = useState(false)

  const storeAddress = [
    data.store.addressStreet,
    data.store.addressNumber,
    data.store.addressComplement,
    data.store.addressNeighborhood,
    `${data.store.addressCity}/${data.store.addressState}`.replace(/^\/|\/$/g, ''),
    data.store.addressZip ? `CEP ${data.store.addressZip}` : '',
  ]
    .filter(Boolean)
    .join(', ')

  const storeDocument = 'informado no cadastro'
  const representativeDocument = 'informado no cadastro'

  function handleContractScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 8

    if (reachedBottom) {
      setHasReachedContractEnd(true)
    }
  }

  async function handleSignContract() {
    if (!acceptTerms) {
      toast.error('Confirme que voce leu e concorda com o contrato.')
      return
    }

    if (signatureCpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite um CPF valido para registrar a assinatura.')
      return
    }

    setSubmitting(true)

    try {
      await saveStore(data.store.id, { contract: true })
      toast.success('Contrato assinado com sucesso.')
      navigate(data.store.firstAccess ? '/app' : '/primeiro-acesso', { replace: true })
    } catch {
      toast.error('Nao foi possivel concluir a assinatura do contrato.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <header className="border-b border-[#ececec] bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-[1.4rem] font-black italic tracking-[-0.06em] text-[#ea1d2c]">
            ohdelivery
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#686868] transition hover:bg-[#f5f5f5]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto h-[calc(100dvh-81px)] max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid h-full w-full grid-rows-[minmax(0,1fr)_auto] gap-4">
          <section className="flex min-h-0 flex-col rounded-[28px] border border-[#ececec] bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ea1d2c]">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#ea1d2c]">
                  Assinatura de contrato
                </p>
                <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-[#1d1d1d]">
                  Revise e assine o contrato da loja
                </h1>
              </div>
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 text-[14px] leading-7 text-[#555]">
              <div className="shrink-0 rounded-3xl border border-[#ececec] bg-[#fafafa] p-5">
                <p className="font-bold text-[#1d1d1d]">Partes do contrato</p>
                <p className="mt-2">
                  Loja: <span className="font-semibold text-[#1d1d1d]">{data.store.name}</span>
                </p>
                <p>
                  Responsavel: <span className="font-semibold text-[#1d1d1d]">{data.store.responsavelNome || 'Nao informado'}</span>
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-[#ececec] p-5 sm:p-6">
                <p className="font-bold text-[#1d1d1d]">Contrato completo</p>
                <div
                  onScroll={handleContractScroll}
                  className="mt-3 min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 text-[13px] leading-6 text-[#555]"
                >
                  <div className="space-y-4">
                    <p className="text-[15px] font-bold uppercase tracking-[0.04em] text-[#1d1d1d]">
                      CONTRATO DE PRESTACAO DE SERVICOS, LICENCIAMENTO DE USO DE PLATAFORMA E INTERMEDIACAO DIGITAL
                    </p>
                    <p>Pelo presente instrumento particular, de um lado:</p>
                    <p>
                      <span className="font-semibold text-[#1d1d1d]">OH DELIVERY</span>, nome empresarial{' '}
                      <span className="font-semibold text-[#1d1d1d]">62.622.102 PLINIO HENRIQUE NOVAES GIGLIOTI</span>,
                      inscrita no CNPJ n. <span className="font-semibold text-[#1d1d1d]">62.622.102/0001-04</span>,
                      com sede na Rua Engenheiro Hans Klots, 417, 11A, Centro, Osvaldo Cruz/SP, CEP 17700-970,
                      telefone (18) 9751-1381, e-mail plinio.giglioti@gmail.com, doravante denominada simplesmente
                      CONTRATADA;
                    </p>
                    <p>e, de outro lado:</p>
                    <p>
                      <span className="font-semibold text-[#1d1d1d]">{data.store.name || '[NOME DO ESTABELECIMENTO PARCEIRO]'}</span>,
                      inscrito(a) no CNPJ/CPF n. <span className="font-semibold text-[#1d1d1d]">{storeDocument}</span>,
                      com sede/endereco em{' '}
                      <span className="font-semibold text-[#1d1d1d]">{storeAddress || 'endereco informado no cadastro'}</span>,
                      telefone <span className="font-semibold text-[#1d1d1d]">[informado no cadastro]</span>, e-mail{' '}
                      <span className="font-semibold text-[#1d1d1d]">{data.profile.email || '[informado no cadastro]'}</span>,
                      neste ato representado(a) por{' '}
                      <span className="font-semibold text-[#1d1d1d]">{data.store.responsavelNome || '[NOME DO REPRESENTANTE]'}</span>,
                      CPF n. <span className="font-semibold text-[#1d1d1d]">{representativeDocument}</span>, doravante
                      denominado(a) simplesmente CONTRATANTE;
                    </p>
                    <p>tem entre si justo e contratado o seguinte:</p>
                  </div>

                  {CONTRACT_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-3">
                      <p className="font-bold uppercase tracking-[0.04em] text-[#1d1d1d]">{section.title}</p>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.items?.length ? (
                        <div className="space-y-2 pl-3">
                          {section.items.map((item) => (
                            <p key={item}>{item}</p>
                          ))}
                        </div>
                      ) : null}
                      {section.trailing?.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="w-full shrink-0 rounded-[28px] border border-[#ececec] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4] text-[#16a34a]">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-[22px] font-black tracking-[-0.02em] text-[#1d1d1d]">
              Confirmar assinatura
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#686868]">
              Role o contrato ate o final para liberar a assinatura. Depois disso, digite o CPF do responsavel para registrar o aceite.
            </p>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">
                Digite o CPF para assinar
              </span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={signatureCpf}
                  onChange={(event) => setSignatureCpf(formatCpf(event.target.value))}
                  placeholder="000.000.000-00"
                  className="h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 pr-12 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]"
                />
                <FileSignature className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
              </div>
            </label>

            <label className="mt-3 flex items-start gap-3 rounded-2xl border border-[#ececec] bg-[#fafafa] px-4 py-4">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#cfcfcf] text-[#ea1d2c] focus:ring-[#ea1d2c]"
              />
              <span className="text-[13px] leading-6 text-[#555]">
                Confirmo que li e concordo com este contrato e que sou o responsavel autorizado pela loja.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void handleSignContract()}
              disabled={submitting || !hasReachedContractEnd}
              className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[14px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assinando...
                </>
              ) : !hasReachedContractEnd ? (
                'Role o contrato ate o final'
              ) : (
                'Assinar contrato'
              )}
            </button>
          </aside>
        </div>
      </main>
    </div>
  )
}
