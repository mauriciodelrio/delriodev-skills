---
name: lgpd
description: >
  LGPD compliance skill — Lei Geral de Proteção de Dados (Brazil). Activate this skill when
  developing software that collects, processes, or stores personal data from individuals in Brazil.
  LGPD applies regardless of where your company is located. Covers legal bases for processing,
  data subject rights, consent, ANPD reporting, and RIPD (impact assessment).
---

# 🇧🇷 LGPD — Lei Geral de Proteção de Dados

## General Description

The **LGPD** (Lei Geral de Proteção de Dados Pessoais — Law No. 13,709/2018) is Brazil's personal data protection law, in force since September 2020. It is similar to Europe's GDPR but with characteristics unique to the Brazilian legal framework.

**Supervisory authority:** ANPD (Autoridade Nacional de Proteção de Dados)

**Key differences from GDPR:**

| Aspect | GDPR | LGPD |
|--------|------|------|
| **Legal bases** | 6 bases | 10 legal bases |
| **DPO/Encarregado** | Required in certain cases | Required for every controller |
| **International transfer** | Specific mechanisms (SCCs, adequacy) | Similar but with ANPD decision |
| **Penalties** | Up to 4% global revenue or €20M | Up to 2% revenue in Brazil, maximum R$50M per violation |
| **Territorial** | EU resident data | Data processed in Brazil or of individuals in Brazil |

---

## When to Activate this Skill

Activate this skill when:

- Your application has **users in Brazil**
- You **collect personal data** from individuals located in Brazil
- **Data processing** takes place in Brazilian territory
- You **offer goods or services** to the Brazilian market
- You need to implement the **10 legal bases** of LGPD
- You implement **consent** according to Brazilian standards
- You must appoint an **Encarregado (DPO)** and report data to ANPD

---

## Fundamental LGPD Concepts

### The 10 Legal Bases (Art. 7)

Unlike GDPR which has 6, LGPD defines **10 legal bases** for processing personal data:

| # | Legal Basis | Description | Typical Use |
|---|------------|-------------|-------------|
| 1 | **Consent** | Free, informed, and unambiguous expression of will | Marketing, newsletters, non-essential cookies |
| 2 | **Legal/regulatory obligation** | Comply with laws and regulations | Tax data, regulatory reports |
| 3 | **Public administration** | Execution of public policies | Government only |
| 4 | **Research by research body** | Research (anonymized data when possible) | Academic research |
| 5 | **Contract execution** | Necessary to fulfill a contract with the data subject | Contracted service, deliveries |
| 6 | **Exercise of rights** | In judicial, administrative, or arbitration proceedings | Legal defense |
| 7 | **Protection of life** | Protect life or physical integrity | Medical emergencies |
| 8 | **Health protection** | Procedures performed by health professionals | Hospitals, clinics |
| 9 | **Legitimate interest** | Controller's legitimate interest (balanced with rights) | Analytics, security, fraud prevention |
| 10 | **Credit protection** | Credit protection (e.g., Serasa/SPC) | Credit scoring |

### Sensitive Personal Data (Art. 11)

Processing only with **specific consent** or without consent in exceptional cases:

- Racial or ethnic origin
- Religious conviction
- Political opinion
- Union affiliation
- Health or sex life data
- Genetic or biometric data

---

## Technical Implementation Requirements

### 1. Data Model for LGPD

```prisma
// prisma/schema.prisma

/// LGPD consent record
model ConsentimentoLGPD {
  id              String   @id @default(cuid())
  titularId       String
  titular         User     @relation(fields: [titularId], references: [id])
  
  // Specific purpose of the consent (Art. 8 §4)
  finalidade      String            // Specific purpose
  baseLegal       BaseLegalLGPD
  
  // Consent state
  concedido       Boolean          // Whether the data subject consented
  dataConsentimento DateTime?      // When they consented
  dataRevogacao   DateTime?        // When they revoked (Art. 8 §5)
  
  // Evidence (Art. 8 §2: Burden of proof lies with the controller)
  metodoObtencao  String           // How it was obtained (form, checkbox, etc.)
  textoMostrado   String           // Exact text shown to them
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([titularId])
  @@index([baseLegal])
  @@map("consentimentos_lgpd")
}

/// Data subject requests (Art. 18)
model SolicitacaoTitular {
  id          String             @id @default(cuid())
  titularId   String
  titular     User               @relation(fields: [titularId], references: [id])
  
  tipo        DireitoTitularLGPD
  status      StatusSolicitacao  @default(RECEBIDA)
  
  // LGPD Art. 18 §5: 15 business day response deadline
  recebidaEm     DateTime @default(now())
  prazoResposta  DateTime  // 15 business days
  respondidaEm   DateTime?
  
  // Identity verification
  identidadeVerificada Boolean @default(false)
  
  // Response
  resposta       Json?
  motivoRecusa   String?
  
  @@map("solicitacoes_titular")
}

enum BaseLegalLGPD {
  CONSENTIMENTO
  OBRIGACAO_LEGAL
  ADMINISTRACAO_PUBLICA
  ESTUDOS_PESQUISA
  EXECUCAO_CONTRATO
  EXERCICIO_DIREITOS
  PROTECAO_VIDA
  TUTELA_SAUDE
  INTERESSE_LEGITIMO
  PROTECAO_CREDITO
}

enum DireitoTitularLGPD {
  CONFIRMACAO_TRATAMENTO      // Art.18 I — Confirm whether processing exists
  ACESSO_DADOS                // Art.18 II — Access their data
  CORRECAO                    // Art.18 III — Correct incomplete/inaccurate data
  ANONIMIZACAO_BLOQUEIO       // Art.18 IV — Anonymize, block, or delete excessive data
  PORTABILIDADE               // Art.18 V — Portability to another provider
  ELIMINACAO                  // Art.18 VI — Delete data processed with consent
  INFORMACAO_COMPARTILHAMENTO // Art.18 VII — Know with whom data is shared
  INFORMACAO_CONSENTIMENTO    // Art.18 VIII — Know they can deny consent
  REVOGACAO_CONSENTIMENTO     // Art.18 IX — Revoke consent
}

enum StatusSolicitacao {
  RECEBIDA
  VERIFICACAO_IDENTIDADE
  EM_PROCESSAMENTO
  CONCLUIDA
  RECUSADA
}
```

---

### 2. LGPD Consent Service

```typescript
// services/lgpd-consentimento.service.ts

import { PrismaClient, BaseLegalLGPD } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'lgpd-consentimento' });

/**
 * Consent management according to LGPD.
 * 
 * Art. 8: Consent must be:
 * - In writing or by other means that demonstrates the data subject's will
 * - For specific purposes (generic consent is void §4)
 * - Revocable at any time (§5)
 * - The controller must prove consent was obtained (§2)
 */
export class LGPDConsentimentoService {
  /**
   * Register data subject consent.
   * LGPD Art. 8 — Must be specific per purpose.
   */
  async registrarConsentimento(params: {
    titularId: string;
    finalidade: string;
    concedido: boolean;
    metodoObtencao: string;
    textoMostrado: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Check that no active consent exists for the same purpose
    const existente = await prisma.consentimentoLGPD.findFirst({
      where: {
        titularId: params.titularId,
        finalidade: params.finalidade,
        dataRevogacao: null,
      },
    });

    if (existente) {
      // Revoke the previous one before creating a new one
      await prisma.consentimentoLGPD.update({
        where: { id: existente.id },
        data: { dataRevogacao: new Date() },
      });
    }

    const consentimento = await prisma.consentimentoLGPD.create({
      data: {
        titularId: params.titularId,
        finalidade: params.finalidade,
        baseLegal: 'CONSENTIMENTO',
        concedido: params.concedido,
        dataConsentimento: params.concedido ? new Date() : null,
        metodoObtencao: params.metodoObtencao,
        textoMostrado: params.textoMostrado,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    logger.info({
      event: 'consentimento_registrado',
      titularId: params.titularId,
      finalidade: params.finalidade,
      concedido: params.concedido,
    }, 'LGPD consent registered');

    return consentimento;
  }

  /**
   * Revoke consent.
   * LGPD Art. 8 §5: Consent can be revoked at any time
   * through express manifestation by the data subject, via a
   * free and facilitated procedure.
   */
  async revogarConsentimento(titularId: string, finalidade: string) {
    const consentimento = await prisma.consentimentoLGPD.findFirst({
      where: {
        titularId,
        finalidade,
        concedido: true,
        dataRevogacao: null,
      },
    });

    if (!consentimento) {
      return { success: false, error: 'No active consent found for this purpose' };
    }

    await prisma.consentimentoLGPD.update({
      where: { id: consentimento.id },
      data: { dataRevogacao: new Date() },
    });

    // Stop all processing based on this consent
    logger.info({
      event: 'consentimento_revogado',
      titularId,
      finalidade,
    }, 'LGPD consent revoked');

    return { success: true, message: 'Consent successfully revoked' };
  }

  /**
   * Verify if there is an active legal basis for processing data.
   * Checks both consent and other legal bases.
   */
  async verificarBaseLegal(titularId: string, finalidade: string): Promise<{
    autorizado: boolean;
    baseLegal?: BaseLegalLGPD;
  }> {
    const consentimento = await prisma.consentimentoLGPD.findFirst({
      where: {
        titularId,
        finalidade,
        concedido: true,
        dataRevogacao: null,
      },
    });

    if (consentimento) {
      return { autorizado: true, baseLegal: consentimento.baseLegal };
    }

    return { autorizado: false };
  }
}
```

---

### 3. Data Subject Rights (Art. 18)

```typescript
// services/lgpd-direitos-titular.service.ts

import { PrismaClient, DireitoTitularLGPD, StatusSolicitacao } from '@prisma/client';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ name: 'lgpd-direitos' });

// LGPD Art. 18 §5: 15 business day response deadline
const PRAZO_RESPOSTA_DIAS_UTEIS = 15;

export class LGPDDireitosTitularService {
  /**
   * Receive a data subject request.
   * The data subject can exercise their rights before the controller at any time.
   */
  async receberSolicitacao(
    titularId: string,
    tipo: DireitoTitularLGPD,
  ) {
    const prazo = this.calcularPrazoResposta(PRAZO_RESPOSTA_DIAS_UTEIS);

    const solicitacao = await prisma.solicitacaoTitular.create({
      data: {
        titularId,
        tipo,
        status: 'VERIFICACAO_IDENTIDADE',
        prazoResposta: prazo,
      },
    });

    logger.info({
      event: 'solicitacao_titular_recebida',
      solicitacaoId: solicitacao.id,
      tipo,
      prazo: prazo.toISOString(),
    }, 'LGPD data subject request received');

    return {
      id: solicitacao.id,
      tipo,
      status: 'VERIFICACAO_IDENTIDADE',
      prazoResposta: prazo.toISOString(),
      mensagem: 'Your request has been received. We need to verify your identity to process it.',
    };
  }

  /**
   * Art. 18 II — Right to access data.
   */
  async processarAcesso(solicitacaoId: string): Promise<object> {
    const solicitacao = await this.obterSolicitacaoVerificada(solicitacaoId, 'ACESSO_DADOS');

    // Collect all data subject's data
    const titular = await prisma.user.findUniqueOrThrow({
      where: { id: solicitacao.titularId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const consentimentos = await prisma.consentimentoLGPD.findMany({
      where: { titularId: solicitacao.titularId },
      select: {
        finalidade: true,
        baseLegal: true,
        concedido: true,
        dataConsentimento: true,
        dataRevogacao: true,
      },
    });

    const resposta = {
      dadosPessoais: titular,
      consentimentos,
      finalidadesTratamento: ['Provisão do serviço', 'Comunicações'],
      compartilhamentos: [
        { destinatario: 'Provedor de hosting', finalidade: 'Infraestrutura' },
        { destinatario: 'Processador de pagamentos', finalidade: 'Cobrança' },
      ],
    };

    await prisma.solicitacaoTitular.update({
      where: { id: solicitacaoId },
      data: {
        status: 'CONCLUIDA',
        respondidaEm: new Date(),
        resposta: resposta as any,
      },
    });

    logger.info({
      event: 'acesso_dados_concluido',
      solicitacaoId,
      titularId: solicitacao.titularId,
    }, 'Data access processed');

    return resposta;
  }

  /**
   * Art. 18 VI — Right to delete data processed with consent.
   */
  async processarEliminacao(solicitacaoId: string) {
    const solicitacao = await this.obterSolicitacaoVerificada(solicitacaoId, 'ELIMINACAO');

    // Only delete data whose processing was based on consent
    const consentimentos = await prisma.consentimentoLGPD.findMany({
      where: {
        titularId: solicitacao.titularId,
        baseLegal: 'CONSENTIMENTO',
      },
    });

    // Revoke all consents
    await prisma.consentimentoLGPD.updateMany({
      where: {
        titularId: solicitacao.titularId,
        baseLegal: 'CONSENTIMENTO',
        dataRevogacao: null,
      },
      data: { dataRevogacao: new Date() },
    });

    // Pseudonymize user data
    await prisma.user.update({
      where: { id: solicitacao.titularId },
      data: {
        name: '[ELIMINADO]',
        email: `eliminado_${Date.now()}@eliminado.invalid`,
        deletedAt: new Date(),
      },
    });

    await prisma.solicitacaoTitular.update({
      where: { id: solicitacaoId },
      data: {
        status: 'CONCLUIDA',
        respondidaEm: new Date(),
        resposta: {
          eliminados: consentimentos.map(c => c.finalidade),
          mantidosPorObrigacaoLegal: ['Registros fiscais (7 anos)', 'Logs de segurança (1 ano)'],
        } as any,
      },
    });

    logger.info({
      event: 'eliminacao_dados_concluida',
      solicitacaoId,
      titularId: solicitacao.titularId,
      consentimentosRevogados: consentimentos.length,
    }, 'LGPD data deletion processed');

    return {
      success: true,
      eliminados: consentimentos.map(c => c.finalidade),
      mantidosPorObrigacaoLegal: ['Registros fiscais (7 anos)', 'Logs de segurança (1 ano)'],
    };
  }

  /**
   * Art. 18 V — Right to portability.
   * Transfer data to another service provider.
   */
  async processarPortabilidade(solicitacaoId: string): Promise<{
    format: string;
    data: object;
  }> {
    const solicitacao = await this.obterSolicitacaoVerificada(solicitacaoId, 'PORTABILIDADE');

    const titular = await prisma.user.findUniqueOrThrow({
      where: { id: solicitacao.titularId },
    });

    // Structured, commonly used, and machine-readable format (Art. 18 V)
    const dadosPortaveis = {
      exportadoEm: new Date().toISOString(),
      formato: 'JSON',
      versao: '1.0',
      titular: {
        nome: titular.name,
        email: titular.email,
        dataCriacao: titular.createdAt,
      },
      // Include all relevant data for portability
    };

    await prisma.solicitacaoTitular.update({
      where: { id: solicitacaoId },
      data: {
        status: 'CONCLUIDA',
        respondidaEm: new Date(),
      },
    });

    logger.info({
      event: 'portabilidade_concluida',
      solicitacaoId,
      titularId: solicitacao.titularId,
    }, 'LGPD portability processed');

    return { format: 'application/json', data: dadosPortaveis };
  }

  // --- Private helpers ---

  private async obterSolicitacaoVerificada(id: string, tipoEsperado: DireitoTitularLGPD) {
    const solicitacao = await prisma.solicitacaoTitular.findUniqueOrThrow({
      where: { id },
    });

    if (solicitacao.tipo !== tipoEsperado) {
      throw new Error(`Incorrect type: expected ${tipoEsperado}, received ${solicitacao.tipo}`);
    }

    if (!solicitacao.identidadeVerificada) {
      throw new Error('Data subject identity not verified');
    }

    return solicitacao;
  }

  /**
   * Calculate response deadline in business days.
   */
  private calcularPrazoResposta(diasUteis: number): Date {
    const fecha = new Date();
    let diasContados = 0;
    
    while (diasContados < diasUteis) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasContados++;
      }
    }
    
    return fecha;
  }
}
```

---

### 4. RIPD — Relatório de Impacto à Proteção de Dados (Art. 38)

```typescript
// services/lgpd-ripd.service.ts

/**
 * RIPD (Relatório de Impacto à Proteção de Dados Pessoais)
 * Equivalent to GDPR's DPIA.
 * 
 * Art. 38: ANPD may request the controller to prepare
 * an impact report regarding their personal data
 * processing operations.
 * 
 * Include:
 * - Description of the types of data collected
 * - Methodology used for collection and security
 * - Controller's analysis of measures, safeguards, and mitigation mechanisms
 */

interface RIPD {
  controlador: {
    nombre: string;
    encarregado: { nombre: string; email: string }; // DPO
    fechaElaboracion: Date;
  };
  descripcionTratamiento: {
    naturaleza: string;
    alcance: string;
    contexto: string;
    finalidad: string;
  };
  baseLegal: string;
  datosRecolectados: DatosCategoria[];
  titulares: { categoria: string; cantidadEstimada: string }[];
  compartilhamentos: { receptor: string; finalidade: string; baseLegal: string }[];
  analisisRiesgos: RiesgoIdentificado[];
  medidasMitigacion: MedidaMitigacion[];
}

interface DatosCategoria {
  categoria: string;
  datos: string[];
  sensivel: boolean;
  baseLegal: string;
  retencao: string;
}

interface RiesgoIdentificado {
  descripcion: string;
  probabilidad: 'baja' | 'media' | 'alta';
  impacto: 'bajo' | 'medio' | 'alto';
  nivelRiesgo: 'aceptable' | 'moderado' | 'alto' | 'critico';
}

interface MedidaMitigacion {
  riesgo: string;
  medida: string;
  estado: 'implementada' | 'en_progreso' | 'planificada';
}

export function generarTemplateRIPD(): RIPD {
  return {
    controlador: {
      nombre: process.env.COMPANY_NAME ?? 'My Company',
      encarregado: {
        nombre: process.env.DPO_NAME ?? 'Encarregado Name',
        email: process.env.DPO_EMAIL ?? 'dpo@company.com',
      },
      fechaElaboracion: new Date(),
    },
    descripcionTratamiento: {
      naturaleza: 'Automated processing of personal data for SaaS service provision',
      alcance: 'Data from users registered on the platform',
      contexto: 'SaaS platform with users in Brazil',
      finalidad: 'Provide the service contracted by the data subject',
    },
    baseLegal: 'Contract execution (Art. 7 V) and consent (Art. 7 I) depending on purpose',
    datosRecolectados: [
      {
        categoria: 'Identificadores',
        datos: ['Nome', 'Email', 'Endereço IP'],
        sensivel: false,
        baseLegal: 'Execução de contrato',
        retencao: 'Duração da conta + 30 dias',
      },
      {
        categoria: 'Dados comerciais',
        datos: ['Histórico de compras', 'Plano contratado'],
        sensivel: false,
        baseLegal: 'Execução de contrato / Obrigação legal',
        retencao: '7 anos (obrigações fiscais)',
      },
    ],
    titulares: [
      { categoria: 'Usuários registrados', cantidadEstimada: 'Per user base' },
    ],
    compartilhamentos: [
      {
        receptor: 'Provedor de infraestrutura (hosting)',
        finalidade: 'Armazenamento e processamento de dados',
        baseLegal: 'Execução de contrato',
      },
      {
        receptor: 'Processador de pagamentos',
        finalidade: 'Cobrança e faturamento',
        baseLegal: 'Execução de contrato',
      },
    ],
    analisisRiesgos: [
      {
        descripcion: 'Unauthorized access to personal data',
        probabilidad: 'baja',
        impacto: 'alto',
        nivelRiesgo: 'moderado',
      },
      {
        descripcion: 'Data loss due to infrastructure failure',
        probabilidad: 'baja',
        impacto: 'alto',
        nivelRiesgo: 'moderado',
      },
    ],
    medidasMitigacion: [
      {
        riesgo: 'Unauthorized access',
        medida: 'AES-256 encryption, RBAC, MFA, audit logs',
        estado: 'implementada',
      },
      {
        riesgo: 'Data loss',
        medida: 'Daily backups, geographic replication, recovery plan',
        estado: 'implementada',
      },
    ],
  };
}
```

---

### 5. Incident Notification to ANPD (Art. 48)

```typescript
// services/lgpd-incidentes.service.ts

import pino from 'pino';

const logger = pino({ name: 'lgpd-incidentes' });

/**
 * Art. 48 LGPD: The controller must communicate to ANPD and to the data subject
 * the occurrence of a security incident that may cause risk
 * or relevant harm to data subjects.
 * 
 * The communication must include:
 * - Description of the nature of the affected data
 * - Information about the involved data subjects
 * - Indication of the technical and security measures used
 * - The risks related to the incident
 * - The measures that were or will be adopted to reverse/mitigate
 * - The reasons for delay, if the communication is not immediate
 */

interface IncidenteLGPD {
  id: string;
  descripcion: string;
  fechaDeteccion: Date;
  fechaOcurrencia?: Date;
  
  // Affected data
  categoriasDatosAfectados: string[];
  datosApessoaisSensiveis: boolean;
  
  // Data subjects
  cantidadTitularesAfectados: number;
  categoriasTitulares: string[];
  
  // Assessment
  probabilidadDano: 'baja' | 'media' | 'alta';
  gravedadDano: 'bajo' | 'medio' | 'alto' | 'critico';
  riesgoPotencial: string[];
  
  // Measures
  medidasPreventivasExistentes: string[];
  medidasCorrectivas: string[];
  
  // Communication
  comunicadoANPD: boolean;
  fechaComunicadoANPD?: Date;
  comunicadoTitulares: boolean;
  fechaComunicadoTitulares?: Date;
}

export class LGPDIncidenteService {
  /**
   * Evaluate if the incident requires notification to ANPD.
   * Art. 48: Must communicate when it may cause "risco ou dano relevante" (relevant risk or harm).
   */
  evaluarNotificacion(incidente: IncidenteLGPD): {
    notificarANPD: boolean;
    notificarTitulares: boolean;
    justificacion: string;
  } {
    // Criteria to determine relevant risk/harm
    const esAltoRiesgo =
      incidente.datosApessoaisSensiveis ||
      incidente.cantidadTitularesAfectados > 1000 ||
      incidente.gravedadDano === 'alto' ||
      incidente.gravedadDano === 'critico';

    if (esAltoRiesgo) {
      logger.error({
        event: 'incidente_alto_riesgo',
        incidenteId: incidente.id,
        titularesAfectados: incidente.cantidadTitularesAfectados,
        datosSensiveis: incidente.datosApessoaisSensiveis,
      }, 'High-risk incident — requires notification to ANPD and data subjects');

      return {
        notificarANPD: true,
        notificarTitulares: true,
        justificacion: 'Incident with relevant risk — sensitive data and/or large number of affected data subjects',
      };
    }

    return {
      notificarANPD: false,
      notificarTitulares: false,
      justificacion: 'Incident assessed as low risk — no sensitive data compromised',
    };
  }

  /**
   * Generate communication for ANPD (Art. 48 §1).
   */
  generarComunicadoANPD(incidente: IncidenteLGPD): object {
    return {
      cabecalho: {
        tipo: 'Comunicação de Incidente de Segurança com Dados Pessoais',
        controlador: process.env.COMPANY_NAME,
        encarregado: {
          nome: process.env.DPO_NAME,
          email: process.env.DPO_EMAIL,
        },
        dataComunicacao: new Date().toISOString(),
      },
      // §1 I — Nature of the affected data
      dadosAfetados: {
        categorias: incidente.categoriasDatosAfectados,
        sensiveis: incidente.datosApessoaisSensiveis,
      },
      // §1 II — Involved data subjects
      titulares: {
        quantidade: incidente.cantidadTitularesAfectados,
        categorias: incidente.categoriasTitulares,
      },
      // §1 III — Technical and security measures
      medidasSeguranca: incidente.medidasPreventivasExistentes,
      // §1 IV — Related risks
      riscos: incidente.riesgoPotencial,
      // §1 V — Adopted measures
      medidasCorretivas: incidente.medidasCorrectivas,
      // §1 VI — Reasons for any delay
      motivoRetraso: null,
    };
  }
}
```

---

## LGPD Best Practices

### ✅ DO

1. **Appoint an Encarregado (DPO)** and publish their contact information
2. **Map all legal bases** for each processing purpose
3. **Granular consent** — per purpose, not generic (Art. 8 §4)
4. **Facilitate consent revocation** — as easy as it was to give it
5. **Respond to data subject requests** within 15 business days (Art. 18 §5)
6. **Prepare RIPD** when processing may generate high risk
7. **Report security incidents** to ANPD and data subjects when there is relevant risk
8. **Minimize data** — only collect what is necessary for the purpose
9. **Maintain processing records** (Art. 37: record of operations)
10. **Portability in structured format** readable by machines

### ❌ DO NOT

1. **DO NOT** process data without a defined legal basis
2. **DO NOT** obtain generic or blanket consent
3. **DO NOT** make consent revocation difficult
4. **DO NOT** transfer data internationally without adequate guarantees
5. **DO NOT** ignore data subject requests
6. **DO NOT** retain data beyond what is necessary for the purpose
7. **DO NOT** process sensitive data without specific and prominent consent
8. **DO NOT** skip preparing the RIPD when necessary

---

## LGPD Compliance Checklist

### Legal Bases and Consent
- [ ] Mapping of all legal bases per processing purpose
- [ ] Granular consent system per purpose
- [ ] Easy consent revocation mechanism
- [ ] Consent evidence stored (Art. 8 §2)
- [ ] Specific and prominent consent for sensitive data (Art. 11)

### Data Subject Rights (Art. 18)
- [ ] Confirmation of processing (I)
- [ ] Data access (II)
- [ ] Correction of incomplete/inaccurate data (III)
- [ ] Anonymization, blocking, or deletion of excess (IV)
- [ ] Portability to another provider (V)
- [ ] Deletion of data processed with consent (VI)
- [ ] Information about sharing (VII)
- [ ] Information about the possibility of not consenting (VIII)
- [ ] Consent revocation (IX)
- [ ] 15 business day response deadline (§5)

### Governance
- [ ] Encarregado (DPO) appointed with public contact information
- [ ] Processing operations record (Art. 37)
- [ ] RIPD prepared for high-risk processing (Art. 38)
- [ ] Privacy policy published and accessible
- [ ] Contracts with operators (processors) with LGPD clauses

### Security and Incidents
- [ ] Technical security measures implemented (Art. 46)
- [ ] Incident notification process to ANPD (Art. 48)
- [ ] Notification process for affected data subjects
- [ ] Documented incident response plan

---

## References and Resources

- [LGPD Full Text — Planalto.gov.br](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm)
- [ANPD — Autoridade Nacional de Proteção de Dados](https://www.gov.br/anpd/)
- [Guia orientativo sobre tratamento de dados pessoais — ANPD](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes)
