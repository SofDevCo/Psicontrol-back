"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TYPE public.enum_customers_billing_records_payment_status AS ENUM (
          'aberto',
          'pago',
          'parcial'
      );

      CREATE TYPE public.enum_customersbillingrecordss_payment_status AS ENUM (
          'aberto',
          'pago',
          'parcial'
      );

      CREATE TABLE public.calendars (
          id integer NOT NULL,
          calendar_name character varying(255) NOT NULL,
          calendar_id character varying(255) NOT NULL,
          user_id integer NOT NULL,
          enabled boolean DEFAULT true NOT NULL
      );

      CREATE SEQUENCE public.calendars_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.calendars_id_seq OWNED BY public.calendars.id;

      CREATE TABLE public.customers (
          customer_id integer NOT NULL,
          user_id integer NOT NULL,
          customer_name character varying(255) NOT NULL,
          customer_phone character varying(15),
          customer_email character varying(255),
          consultation_fee numeric(10,2),
          archived boolean,
          alternative_name character varying(255),
          customer_cpf_cnpj character varying(14) DEFAULT false NOT NULL,
          alternative_cpf_cnpj character varying(14),
          customer_dob date
      );

      CREATE TABLE public.customers_billing_records (
          id integer NOT NULL,
          customer_id integer NOT NULL,
          month_and_year character varying(7),
          total_consultation_fee numeric(10,2),
          payment_amount numeric(10,2),
          payment_date date,
          payment_bank character varying(255),
          was_charged boolean,
          payment_status character varying(10),
          sending_invoice boolean,
          consultation_fee numeric(10,2),
          consultation_days text,
          num_consultations integer
      );

      CREATE SEQUENCE public.customers_billing_records_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.customers_billing_records_id_seq OWNED BY public.customers_billing_records.id;

      CREATE SEQUENCE public.customers_customer_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;

      CREATE TABLE public.events (
          customers_id integer NOT NULL,
          event_name character varying(255),
          date date,
          google_event_id character varying(255),
          status character varying(255),
          created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
          calendar_id character varying,
          user_id integer,
          customer_id integer
      );

      CREATE SEQUENCE public.events_customers_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.events_customers_id_seq OWNED BY public.events.customers_id;

      CREATE TABLE public.income (
          id integer NOT NULL,
          user_id integer NOT NULL,
          name character varying(255),
          value numeric(10,2),
          date date NOT NULL,
          type character varying(10) NOT NULL,
          month_year character varying(7)
      );

      CREATE SEQUENCE public.income_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.income_id_seq OWNED BY public.income.id;

      CREATE TABLE public.incomes (
          user_id integer NOT NULL,
          id integer NOT NULL,
          name character varying(255),
          value numeric(10,2),
          date date NOT NULL,
          type character varying(10) NOT NULL
      );

      CREATE SEQUENCE public.incomes_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.incomes_id_seq OWNED BY public.incomes.id;

      CREATE TABLE public.users (
          user_id integer NOT NULL,
          user_name character varying(255) NOT NULL,
          user_cpf character varying(11),
          user_cnpj character varying(14),
          crp_number character varying(15),
          user_phone character varying(15),
          user_email character varying(255) NOT NULL,
          access_token character varying(255),
          refresh_token character varying(255),
          autentication_token character varying(255),
          image character varying(255),
          user_message text,
          clinic_name character varying(255)
      );

      CREATE SEQUENCE public.users_user_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;

      ALTER TABLE ONLY public.calendars ALTER COLUMN id SET DEFAULT nextval('public.calendars_id_seq'::regclass);

      ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);

      ALTER TABLE ONLY public.customers_billing_records ALTER COLUMN id SET DEFAULT nextval('public.customers_billing_records_id_seq'::regclass);

      ALTER TABLE ONLY public.events ALTER COLUMN customers_id SET DEFAULT nextval('public.events_customers_id_seq'::regclass);

      ALTER TABLE ONLY public.income ALTER COLUMN id SET DEFAULT nextval('public.income_id_seq'::regclass);

      ALTER TABLE ONLY public.incomes ALTER COLUMN id SET DEFAULT nextval('public.incomes_id_seq'::regclass);

      ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);  
    `);
  },
};
